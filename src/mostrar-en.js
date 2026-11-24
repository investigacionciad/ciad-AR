import * as ecs from '@8thwall/ecs'

const esVisor = /oculus|quest/i.test(navigator.userAgent)

ecs.registerComponent({
  name: 'mostrar-en',
  schema: {
    visor: ecs.boolean,
  },
  add: (world, component) => {
    const {eid} = component
    if (component.schemaAttribute.get(eid).visor !== esVisor) {
      setTimeout(() => world.deleteEntity(eid))
    }
  },
})
