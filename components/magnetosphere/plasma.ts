import * as THREE from 'three';
import {
  coupling,
  outflowPoint,
  tailTransportPoint,
  type ModelState,
} from '@/lib/magnetosphere';

/** Analytic, explicitly illustrative pressure volumes; no imported simulation values. */
export function createPlasmaVolumes(scene: THREE.Scene) {
  const uniforms = {
    uTime: { value: 0 },
    uActivity: { value: 0.5 },
    uPlasma: { value: 1 },
    uOutflow: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    premultipliedAlpha: true,
    vertexShader: `varying vec3 worldPosition; void main(){vec4 p=modelMatrix*vec4(position,1.);worldPosition=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `
   precision highp float;
   varying vec3 worldPosition;
   uniform float uTime,uActivity,uPlasma,uOutflow;
   vec3 ramp(float d){vec3 a=vec3(.08,.18,.56),b=vec3(.62,.15,.61),c=vec3(1.,.44,.19),e=vec3(1.,.94,.55);return d<.3?mix(a,b,d/.3):d<.65?mix(b,c,(d-.3)/.35):mix(c,e,clamp((d-.65)/.35,0.,1.));}
   vec2 field(vec3 p){
    float r=length(p.xz),phi=atan(p.z,p.x);
    float center=3.85+.35*uActivity*max(0.,cos(phi));
    float width=.78+.28*uActivity;
    float ring=exp(-.5*pow((r-center)/width,2.)-.5*pow(p.y/(.6+.22*uActivity),2.));
    ring*=.65+.25*max(0.,sin(phi))+.1*sin(phi*2.-uTime*.17);
    float sheetY=p.y-.18*sin(p.x*.35+uTime*.22)*smoothstep(5.,15.,p.x);
    float sheet=exp(-.5*pow(sheetY/(.7+.4*uActivity),2.))*(1.-smoothstep(8.,13.,abs(p.z)))*smoothstep(4.,8.,p.x)*(1.-smoothstep(32.,36.,p.x));
    float front=exp(-pow((p.x-(18.-mod(uTime*1.15,13.)))/1.7,2.))*exp(-pow(p.z/3.,2.));
    float pressure=uPlasma*(ring*(.72+.3*uActivity)+sheet*(.25+.12*uActivity+.16*front*uActivity));
    float h=abs(p.y),t=clamp((h-1.03)/7.,0.,1.),cx=6.5*t*t,w=.22+1.2*t;
    float plume=uOutflow*exp(-((p.x-cx)*(p.x-cx)+p.z*p.z)/(w*w))*pow(1.-t,1.35)*smoothstep(1.02,1.22,h)*(1.-smoothstep(7.5,8.1,h));
    return vec2(pressure,plume);
   }
   void main(){
    vec3 ro=cameraPosition,rd=normalize(worldPosition-ro);
    vec3 mn=vec3(-8.,-9.,-14.),mx=vec3(37.,9.,14.);
    vec3 safeRay=mix(vec3(-1.),vec3(1.),step(vec3(0.),rd))*max(abs(rd),vec3(.000001));
    vec3 inv=1./safeRay,t0=(mn-ro)*inv,t1=(mx-ro)*inv;
    vec3 lo=min(t0,t1),hi=max(t0,t1);
    float nearT=max(0.,max(lo.x,max(lo.y,lo.z))),farT=min(hi.x,min(hi.y,hi.z));
    // Earth is opaque. Stop integration at its near surface, including in close-up views.
    float b=dot(ro,rd),c=dot(ro,ro)-1.0001,disc=b*b-c;
    if(disc>0.){float hit=-b-sqrt(disc);if(hit>0.)farT=min(farT,hit);}
    if(farT<=nearT)discard;
    float stepSize=(farT-nearT)/72.;vec4 acc=vec4(0.);
    for(int i=0;i<72;i++){
     float t=nearT+(float(i)+.5)*stepSize;vec2 f=field(ro+rd*t);
     float density=f.x*.72+f.y*1.8;
     if(density>.008){vec3 rgb=(ramp(clamp(f.x,0.,1.))*f.x*.72+vec3(.2,.85,1.)*f.y*1.8)/density;float alpha=1.-exp(-density*stepSize*.65);acc.rgb+=(1.-acc.a)*rgb*alpha;acc.a+=(1.-acc.a)*alpha;}
     if(acc.a>.94)break;
    }
    if(acc.a<.005)discard;
    gl_FragColor=acc;
   }
  `,
  });
  const box = new THREE.Mesh(new THREE.BoxGeometry(45, 18, 28), material);
  box.position.x = 14.5;
  box.renderOrder = 1;
  scene.add(box);
  function softPoints(count: number, hex: number, size: number) {
    const positions = new Float32Array(count * 3),
      opacity = new Float32Array(count),
      geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('intensity', new THREE.BufferAttribute(opacity, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(hex) },
        uSize: { value: size },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `attribute float intensity;varying float alpha;uniform float uSize;void main(){alpha=intensity;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(uSize*350./(-p.z),1.5,32.);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform vec3 uColor;varying float alpha;void main(){vec2 p=gl_PointCoord-.5;float a=exp(-dot(p,p)*16.)*alpha;if(a<.02)discard;gl_FragColor=vec4(uColor,a);}`,
    });
    const points = new THREE.Points(geometry, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    scene.add(points);
    return { points, positions, opacity, geometry };
  }
  const ring = softPoints(760, 0xffcc86, 0.2),
    transport = softPoints(550, 0xffa566, 0.16),
    outflow = softPoints(640, 0x9df4ff, 0.14);
  const directionGeometry = new THREE.ConeGeometry(0.13, 0.52, 8),
    directionMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc87a,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
  const directions = new THREE.InstancedMesh(
    directionGeometry,
    directionMaterial,
    46,
  );
  directions.frustumCulled = false;
  directions.renderOrder = 2;
  scene.add(directions);
  const dummy = new THREE.Object3D(),
    axis = new THREE.Vector3(0, 1, 0),
    tangent = new THREE.Vector3();
  function update(state: ModelState, time: number, stage: number) {
    const active = coupling(state);
    uniforms.uTime.value = time;
    uniforms.uActivity.value = active;
    uniforms.uPlasma.value = state.plasma ? 1 : 0;
    uniforms.uOutflow.value = state.outflow ? 1 : 0;
    box.visible = state.plasma || state.outflow;
    ring.points.visible = state.plasma;
    transport.points.visible = state.plasma;
    directions.visible = state.plasma;
    outflow.points.visible = state.outflow;
    for (let i = 0; i < 760; i++) {
      const seed = i * 0.61803398875,
        phi = (seed % 1) * Math.PI * 2 + time * (0.12 + 0.02 * (i % 7)),
        r = 3.85 + 0.9 * Math.sin(i * 8.32),
        y = 0.7 * Math.sin(i * 7.71 + time * 0.13);
      ring.positions.set([r * Math.cos(phi), y, r * Math.sin(phi)], i * 3);
      ring.opacity[i] = 0.25 + 0.35 * active;
    }
    for (let i = 0; i < 550; i++) {
      const t = (i * 0.61803398875 + time * (0.045 + 0.035 * active)) % 1,
        seed = (i * 0.75487766) % 1,
        tailward = i % 3 === 0;
      transport.positions.set(tailTransportPoint(t, seed, tailward), i * 3);
      transport.opacity[i] =
        (0.25 + 0.6 * active) * (stage === 2 || stage === 3 ? 1 : 0.6);
    }
    for (let i = 0; i < 640; i++) {
      const t = (i * 0.61803398875 + time * 0.065) % 1;
      outflow.positions.set(
        outflowPoint(t, (i * 0.75487766) % 1, i % 2 === 0 ? 1 : -1),
        i * 3,
      );
      outflow.opacity[i] = 0.65 * Math.pow(1 - t, 0.7);
    }
    for (let i = 0; i < 46; i++) {
      const t = (i * 0.61803398875 + time * (0.045 + 0.035 * active)) % 1,
        seed = (i * 0.75487766) % 1,
        tailward = i % 3 === 0;
      const p = tailTransportPoint(t, seed, tailward),
        q = tailTransportPoint(Math.min(1, t + 0.001), seed, tailward);
      dummy.position.set(...p);
      tangent.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]).normalize();
      dummy.quaternion.setFromUnitVectors(axis, tangent);
      dummy.updateMatrix();
      directions.setMatrixAt(i, dummy.matrix);
    }
    directions.instanceMatrix.needsUpdate = true;
    for (const set of [ring, transport, outflow]) {
      set.geometry.attributes.position.needsUpdate = true;
      set.geometry.attributes.intensity.needsUpdate = true;
    }
  }
  return { update };
}
