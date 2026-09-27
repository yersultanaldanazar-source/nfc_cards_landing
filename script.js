const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_pixelRatio;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {
    vec3 color1 = c1.rgb * c1.a;
    vec3 color2 = c2.rgb * c2.a;
    vec3 color3 = c3.rgb * c3.a;

    float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edge_blur, mixer);
    float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edge_blur, mixer);

    vec3 blended_color_2 = mix(color1, color2, r1);
    float blended_opacity_2 = mix(c1.a, c2.a, r1);

    vec3 c = mix(blended_color_2, color3, r2);
    float o = mix(blended_opacity_2, c3.a, r2);
    return vec4(c, o);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    float t = .5 * u_time;

    float noise_scale = .0005 + .006 * u_scale;

    uv -= .5;
    uv *= (noise_scale * u_resolution);
    uv = rotate(uv, u_rotation * .5 * PI);
    uv /= u_pixelRatio;
    uv += .5;

    float n1 = noise(uv * 1. + t);
    float n2 = noise(uv * 2. - t);
    float angle = n1 * TWO_PI;
    uv.x += 4. * u_distortion * n2 * cos(angle);
    uv.y += 4. * u_distortion * n2 * sin(angle);

    float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));
    for (float i = 1.; i <= iterations_number; i++) {
        uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);
        uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);
    }

    float proportion = clamp(u_proportion, 0., 1.);

    float shape = 0.;
    float mixer = 0.;
    if (u_shape < .5) {
      vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);
      shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);
      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
    } else if (u_shape < 1.5) {
      vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);
      float f = fract(stripes_shape_uv.y);
      shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);
      mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
    } else {
      float sh = 1. - uv.y;
      sh -= .5;
      sh /= (noise_scale * u_resolution.y);
      sh += .5;
      float shape_scaling = .2 * (1. - u_shapeScale);
      shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));
      mixer = shape;
    }

    vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);

    fragColor = vec4(color_mix.rgb, color_mix.a);
}
`;

function hexToRgba(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    return [r, g, b, 1];
}

function initAnimatedGradient() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const params = {
        color1: "#0a001a",
        color2: "#1a0b2e",
        color3: "#f20089",
        rotation: -45,
        proportion: 60,
        scale: 0.6,
        speed: 15,
        distortion: 40,
        swirl: 80,
        swirlIterations: 10,
        softness: 100,
        offset: 200,
        shape: 2, // Edge
        shapeSize: 50
    };

    try {
        const gl = canvas.getContext("webgl2", {
            premultipliedAlpha: true,
            alpha: true,
            antialias: true
        });
        if (!gl) return;

        const vertexShaderSource = `#version 300 es
        in vec4 a_position;
        void main() {
          gl_Position = a_position;
        }`;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) return;

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, FRAGMENT_SHADER);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) return;

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
        gl.useProgram(program);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
        );

        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const uniforms = {
            u_time: gl.getUniformLocation(program, "u_time"),
            u_resolution: gl.getUniformLocation(program, "u_resolution"),
            u_pixelRatio: gl.getUniformLocation(program, "u_pixelRatio"),
            u_scale: gl.getUniformLocation(program, "u_scale"),
            u_rotation: gl.getUniformLocation(program, "u_rotation"),
            u_color1: gl.getUniformLocation(program, "u_color1"),
            u_color2: gl.getUniformLocation(program, "u_color2"),
            u_color3: gl.getUniformLocation(program, "u_color3"),
            u_proportion: gl.getUniformLocation(program, "u_proportion"),
            u_softness: gl.getUniformLocation(program, "u_softness"),
            u_shape: gl.getUniformLocation(program, "u_shape"),
            u_shapeScale: gl.getUniformLocation(program, "u_shapeScale"),
            u_distortion: gl.getUniformLocation(program, "u_distortion"),
            u_swirl: gl.getUniformLocation(program, "u_swirl"),
            u_swirlIterations: gl.getUniformLocation(program, "u_swirlIterations"),
        };

        const c1 = hexToRgba(params.color1);
        const c2 = hexToRgba(params.color2);
        const c3 = hexToRgba(params.color3);

        const resize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            gl.viewport(0, 0, canvas.width, canvas.height);
        };

        resize();
        window.addEventListener("resize", resize);

        const startTime = performance.now();

        const animate = (time) => {
            const elapsed = (time - startTime) / 1000;
            const speed = (params.speed / 100) * 5;

            gl.uniform1f(uniforms.u_time, elapsed * speed + params.offset * 0.01);
            gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
            gl.uniform1f(uniforms.u_pixelRatio, window.devicePixelRatio || 1);
            gl.uniform1f(uniforms.u_scale, params.scale);
            gl.uniform1f(uniforms.u_rotation, (params.rotation * Math.PI) / 180);

            gl.uniform4f(uniforms.u_color1, c1[0], c1[1], c1[2], c1[3]);
            gl.uniform4f(uniforms.u_color2, c2[0], c2[1], c2[2], c2[3]);
            gl.uniform4f(uniforms.u_color3, c3[0], c3[1], c3[2], c3[3]);

            gl.uniform1f(uniforms.u_proportion, params.proportion / 100);
            gl.uniform1f(uniforms.u_softness, params.softness / 100);
            gl.uniform1f(uniforms.u_shape, params.shape);
            gl.uniform1f(uniforms.u_shapeScale, params.shapeSize / 100);
            gl.uniform1f(uniforms.u_distortion, params.distortion / 50);
            gl.uniform1f(uniforms.u_swirl, params.swirl / 100);
            gl.uniform1f(uniforms.u_swirlIterations, params.swirlIterations);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    } catch (e) {
        console.error("WebGL error:", e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initAnimatedGradient();

    const urlParams = new URLSearchParams(window.location.search);
    const placeId = urlParams.get('id');

    const statusMessage = document.getElementById('status-message');
    const content = document.getElementById('content');
    
    if (!placeId) {
        statusMessage.textContent = 'Ошибка: Заведение не указано в ссылке. Отсканируйте NFC-метку еще раз.';
        return;
    }

    let placeData = null;

    try {
        const response = await fetch('/places.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error('Network error');
        
        const places = await response.json();
        placeData = places[placeId];
        
        if (!placeData) {
            statusMessage.textContent = 'Ошибка: Заведение не найдено в базе.';
            return;
        }

        document.getElementById('place-name').textContent = placeData.name;
        document.getElementById('logo').src = placeData.logo_url;
        
        statusMessage.classList.add('hidden');
        content.classList.remove('hidden');
    } catch (error) {
        statusMessage.textContent = 'Ошибка загрузки данных.';
        console.error(error);
        return;
    }

    const stars = document.querySelectorAll('.star');
    const complaintBlock = document.getElementById('complaint-block');
    let selectedRating = 0;

    const updateStars = (rating) => {
        stars.forEach(star => {
            const value = parseInt(star.getAttribute('data-value'));
            if (value <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    };

    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            if (selectedRating === 0) updateStars(parseInt(star.getAttribute('data-value')));
        });
        
        star.addEventListener('mouseleave', () => {
            if (selectedRating === 0) updateStars(0);
        });

        star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-value'));
            updateStars(selectedRating);
            
            if (selectedRating >= 4) {
                window.location.href = placeData.map_link;
            } else {
                complaintBlock.classList.remove('hidden');
            }
        });
    });

    const submitBtn = document.getElementById('submit-btn');
    const complaintInput = document.getElementById('complaint-input');
    const thankYouBlock = document.getElementById('thank-you-block');

    submitBtn.addEventListener('click', async () => {
        const text = complaintInput.value.trim();
        if (!text) {
            alert('Пожалуйста, опишите проблему.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId, stars: selectedRating, text })
            });

            if (!response.ok) throw new Error('API Error');

            complaintBlock.classList.add('hidden');
            document.getElementById('stars').classList.add('hidden');
            document.getElementById('subtitle').classList.add('hidden');
            thankYouBlock.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            alert('Произошла ошибка при отправке. Попробуйте еще раз.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
    });
});
