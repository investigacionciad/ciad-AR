import * as ecs from '@8thwall/ecs'

const cleanups = new Map()

ecs.registerComponent({
  name: 'tocar-para-colocar',
  add: (world, component) => {
    const THREE = window.THREE
    const {eid} = component
    const raycaster = new THREE.Raycaster()
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()

    const onTouch = (event) => {
      const {position, start} = event.data
      if (Math.hypot(position.x - start.x, position.y - start.y) > 0.03) {
        return
      }

      const {x, y} = position
      raycaster.setFromCamera({x: x * 2 - 1, y: 1 - y * 2}, world.three.activeCamera)

      if (!raycaster.ray.intersectPlane(floor, hit) || hit.distanceTo(raycaster.ray.origin) > 10) {
        return
      }

      const height = world.transform.getLocalPosition(eid).y
      world.setPosition(eid, hit.x, height, hit.z)
    }

    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouch)

    cleanups.set(eid, () => {
      world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouch)
    })
  },
  remove: (world, component) => {
    cleanups.get(component.eid)?.()
    cleanups.delete(component.eid)
  },
})
