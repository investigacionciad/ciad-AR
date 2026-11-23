import * as ecs from '@8thwall/ecs'

const cleanups = new Map()

ecs.registerComponent({
  name: 'tap-to-place',
  schema: {
    shadow: ecs.eid,
  },
  add: (world, component) => {
    const THREE = window.THREE
    const {eid} = component
    const {shadow} = component.schemaAttribute.get(eid)
    const raycaster = new THREE.Raycaster()
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()

    const onTouch = (event) => {
      const {x, y} = event.data.position
      raycaster.setFromCamera({x: x * 2 - 1, y: 1 - y * 2}, world.three.activeCamera)

      if (!raycaster.ray.intersectPlane(floor, hit) || hit.distanceTo(raycaster.ray.origin) > 10) {
        return
      }

      const height = world.transform.getLocalPosition(eid).y
      world.setPosition(eid, hit.x, height, hit.z)
      world.setPosition(shadow, hit.x, 0.01, hit.z)
    }

    const onTracking = (event) => {
      const visible = event.data.status === 'NORMAL'
      for (const target of [eid, shadow]) {
        if (visible) {
          ecs.Hidden.remove(world, target)
        } else {
          ecs.Hidden.set(world, target)
        }
      }
    }

    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouch)
    world.events.addListener(world.events.globalId, ecs.events.REALITY_TRACKING_STATUS, onTracking)

    cleanups.set(eid, () => {
      world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouch)
      world.events.removeListener(world.events.globalId, ecs.events.REALITY_TRACKING_STATUS, onTracking)
    })
  },
  remove: (world, component) => {
    cleanups.get(component.eid)?.()
    cleanups.delete(component.eid)
  },
})
