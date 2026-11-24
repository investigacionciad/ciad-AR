import * as ecs from '@8thwall/ecs'

const cleanups = new Map()
const ZONA_MUERTA = 0.15

ecs.registerComponent({
  name: 'colocar-con-control',
  add: (world, component) => {
    const THREE = window.THREE
    const {eid} = component
    const {renderer} = world.three
    const toWorld = new THREE.Matrix4()
    const pointer = new THREE.Matrix4()
    const inverse = new THREE.Matrix4()
    const ray = new THREE.Ray()
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    const head = new THREE.Vector3()
    const offset = new THREE.Vector3()
    let session = null
    let grabbing = null
    let lastTime = 0
    let scale = world.three.entityToObject.get(eid).scale.x

    const updateToWorld = (frame) => {
      const viewer = frame.getViewerPose(renderer.xr.getReferenceSpace())
      if (!viewer) {
        return false
      }
      toWorld.fromArray(viewer.transform.inverse.matrix).premultiply(world.three.activeCamera.matrixWorld)
      return true
    }

    const getPointer = (frame, space) => {
      const pose = frame.getPose(space, renderer.xr.getReferenceSpace())
      if (!pose) {
        return false
      }
      pointer.fromArray(pose.transform.matrix).premultiply(toWorld)
      return true
    }

    const onSelect = (event) => {
      if (!updateToWorld(event.frame) || !getPointer(event.frame, event.inputSource.targetRaySpace)) {
        return
      }

      ray.origin.setFromMatrixPosition(pointer)
      ray.direction.set(0, 0, -1).transformDirection(pointer)

      if (!ray.intersectPlane(floor, hit) || hit.distanceTo(ray.origin) > 10) {
        return
      }

      head.setFromMatrixPosition(world.three.activeCamera.matrixWorld)
      if (Math.hypot(hit.x - head.x, hit.z - head.z) < 0.8) {
        return
      }

      const height = world.transform.getLocalPosition(eid).y
      world.setPosition(eid, hit.x, height, hit.z)
      world.transform.lookAtWorld(eid, {x: head.x, y: height, z: head.z})
    }

    const onFrame = (time, frame) => {
      if (!grabbing) {
        return
      }
      session.requestAnimationFrame(onFrame)

      const space = grabbing.gripSpace || grabbing.targetRaySpace
      if (!getPointer(frame, space)) {
        return
      }

      hit.copy(offset).applyMatrix4(pointer)
      world.setPosition(eid, hit.x, world.transform.getLocalPosition(eid).y, hit.z)

      const axes = grabbing.gamepad ? grabbing.gamepad.axes : []
      const dt = lastTime ? (time - lastTime) / 1000 : 0
      lastTime = time

      if (axes.length >= 4 && Math.abs(axes[2]) > ZONA_MUERTA) {
        world.transform.rotateSelf(eid, ecs.math.quat.yRadians(-axes[2] * 2 * dt))
      }

      if (axes.length >= 4 && Math.abs(axes[3]) > ZONA_MUERTA) {
        scale = Math.min(1, Math.max(0.1, scale * Math.exp(-axes[3] * dt)))
        world.setScale(eid, scale, scale, scale)
      }
    }

    const onSqueezeStart = (event) => {
      if (grabbing) {
        return
      }

      const space = event.inputSource.gripSpace || event.inputSource.targetRaySpace
      if (!updateToWorld(event.frame) || !getPointer(event.frame, space)) {
        return
      }

      const position = world.transform.getWorldPosition(eid)
      offset.set(position.x, position.y, position.z).applyMatrix4(inverse.copy(pointer).invert())
      grabbing = event.inputSource
      lastTime = 0
      session.requestAnimationFrame(onFrame)
    }

    const onSqueezeEnd = (event) => {
      if (event.inputSource === grabbing) {
        grabbing = null
      }
    }

    const onSessionStart = () => {
      session = renderer.xr.getSession()
      session.addEventListener('select', onSelect)
      session.addEventListener('squeezestart', onSqueezeStart)
      session.addEventListener('squeezeend', onSqueezeEnd)
    }

    const onSessionEnd = () => {
      session = null
      grabbing = null
    }

    renderer.xr.addEventListener('sessionstart', onSessionStart)
    renderer.xr.addEventListener('sessionend', onSessionEnd)
    if (renderer.xr.getSession()) {
      onSessionStart()
    }

    cleanups.set(eid, () => {
      renderer.xr.removeEventListener('sessionstart', onSessionStart)
      renderer.xr.removeEventListener('sessionend', onSessionEnd)
      if (session) {
        session.removeEventListener('select', onSelect)
        session.removeEventListener('squeezestart', onSqueezeStart)
        session.removeEventListener('squeezeend', onSqueezeEnd)
      }
    })
  },
  remove: (world, component) => {
    cleanups.get(component.eid)?.()
    cleanups.delete(component.eid)
  },
})
