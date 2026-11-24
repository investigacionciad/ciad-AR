import * as ecs from '@8thwall/ecs'

const cleanups = new Map()

ecs.registerComponent({
  name: 'colocar-con-control',
  add: (world, component) => {
    const THREE = window.THREE
    const {eid} = component
    const {renderer} = world.three
    const toWorld = new THREE.Matrix4()
    const pointer = new THREE.Matrix4()
    const ray = new THREE.Ray()
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    let session = null

    const onSelect = (event) => {
      const space = renderer.xr.getReferenceSpace()
      const viewer = event.frame.getViewerPose(space)
      const pose = event.frame.getPose(event.inputSource.targetRaySpace, space)
      if (!viewer || !pose) {
        return
      }

      toWorld.fromArray(viewer.transform.inverse.matrix).premultiply(world.three.activeCamera.matrixWorld)
      pointer.fromArray(pose.transform.matrix).premultiply(toWorld)
      ray.origin.setFromMatrixPosition(pointer)
      ray.direction.set(0, 0, -1).transformDirection(pointer)

      if (!ray.intersectPlane(floor, hit) || hit.distanceTo(ray.origin) > 10) {
        return
      }

      const height = world.transform.getLocalPosition(eid).y
      world.setPosition(eid, hit.x, height, hit.z)
    }

    const onSessionStart = () => {
      session = renderer.xr.getSession()
      session.addEventListener('select', onSelect)
    }

    const onSessionEnd = () => {
      session = null
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
      }
    })
  },
  remove: (world, component) => {
    cleanups.get(component.eid)?.()
    cleanups.delete(component.eid)
  },
})
