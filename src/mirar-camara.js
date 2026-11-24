import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'mirar-camara',
  tick: (world, component) => {
    const camera = world.transform.getWorldPosition(world.camera.getActiveEid())
    const position = world.transform.getWorldPosition(component.eid)
    world.transform.lookAtWorld(component.eid, {x: camera.x, y: position.y, z: camera.z})
  },
})
