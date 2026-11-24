import * as ecs from '@8thwall/ecs'

const modoActual = location.pathname.split('/').includes('3d') ? '3d' : 'video'

ecs.registerComponent({
  name: 'mostrar-en',
  schema: {
    modo: ecs.string,
  },
  add: (world, component) => {
    const {eid} = component
    if (component.schemaAttribute.get(eid).modo !== modoActual) {
      setTimeout(() => world.deleteEntity(eid))
    }
  },
})
