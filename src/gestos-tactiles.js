import * as ecs from '@8thwall/ecs'

const cleanups = new Map()

ecs.registerComponent({
  name: 'gestos-tactiles',
  add: (world, component) => {
    const {eid} = component
    let scale = world.three.entityToObject.get(eid).scale.x

    const onMove = (event) => {
      const {touchCount, positionChange, spread, spreadChange} = event.data

      if (touchCount === 1) {
        world.transform.rotateSelf(eid, ecs.math.quat.yRadians(positionChange.x * 4))
      }

      if (touchCount === 2 && spread - spreadChange > 0) {
        scale = Math.min(1, Math.max(0.1, scale * spread / (spread - spreadChange)))
        world.setScale(eid, scale, scale, scale)
      }
    }

    world.events.addListener(world.events.globalId, ecs.input.GESTURE_MOVE, onMove)

    cleanups.set(eid, () => {
      world.events.removeListener(world.events.globalId, ecs.input.GESTURE_MOVE, onMove)
    })
  },
  remove: (world, component) => {
    cleanups.get(component.eid)?.()
    cleanups.delete(component.eid)
  },
})
