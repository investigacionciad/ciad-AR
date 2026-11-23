import * as ecs from '@8thwall/ecs'

const componentCleanups = new Map()

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D videoTex;
  uniform float threshold;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(videoTex, vUv);
    float greenDominance = color.g - max(color.r, color.b);
    float alpha = 1.0 - smoothstep(threshold, threshold + 0.1, greenDominance);

    if (alpha <= 0.0) {
      discard;
    }

    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`

const createChromaMaterial = (THREE, videoTexture, threshold) => new THREE.ShaderMaterial({
  uniforms: {
    videoTex: {value: videoTexture},
    threshold: {value: threshold},
  },
  vertexShader,
  fragmentShader,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})

const findVideoTexture = (object) => {
  let videoTexture = null

  object.traverse((child) => {
    if (videoTexture || !child.isMesh) {
      return
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material]
    const material = materials.find(candidate => candidate && candidate.map)
    if (material) {
      videoTexture = material.map
    }
  })

  return videoTexture
}

ecs.registerComponent({
  name: 'chroma-key',
  schema: {
    threshold: ecs.f32,
  },
  schemaDefaults: {
    threshold: 0.25,
  },
  add: (world, component) => {
    const THREE = window.THREE
    const object = world.three.entityToObject.get(component.eid)

    if (!object) {
      console.error('No se encontró el objeto 3D para aplicar chroma-key.')
      return
    }

    const setVideoPaused = (paused) => {
      ecs.VideoControls.set(world, component.eid, {paused})
    }

    const onVisibilityChange = () => setVideoPaused(document.hidden)
    const onPageHide = () => setVideoPaused(true)
    const onPageShow = () => setVideoPaused(document.hidden)

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    setVideoPaused(document.hidden)

    const interval = setInterval(() => {
      const videoTexture = findVideoTexture(object)

      if (!videoTexture) {
        return
      }

      clearInterval(interval)

      const {threshold} = component.schemaAttribute.get(component.eid)
      object.traverse((child) => {
        if (!child.isMesh) {
          return
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material]
        child.material = materials.map((material) => {
          if (!material || !material.map) {
            return material
          }
          return createChromaMaterial(THREE, material.map, threshold)
        })

        if (child.material.length === 1) {
          child.material = child.material[0]
        }
      })
    }, 100)

    componentCleanups.set(component.eid, () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
    })
  },
  remove: (world, component) => {
    const cleanup = componentCleanups.get(component.eid)
    if (!cleanup) {
      return
    }

    cleanup()
    componentCleanups.delete(component.eid)
  },
})
