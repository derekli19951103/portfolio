precision mediump float; // It is required to set a floating point precision in all fragment shaders.

// Interpolated values from vertex shader
varying vec3 normalInterp; // Normal
varying vec3 vertPos; // Vertex position
varying vec3 viewVec; // Interpolated view vector

// uniform values remain the same across the scene
uniform float Ka;   // Ambient reflection coefficient
uniform float Kd;   // Diffuse reflection coefficient
uniform float Ks;   // Specular reflection coefficient
uniform float shininessVal; // Shininess

// Material color
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;

uniform vec3 lightPos; // Light position in camera space

void main() {
  // Your solution should go here.
  // Only the ambient colour calculations have been provided as an example.

    vec3 N = normalize(normalInterp);
    vec3 L = normalize(lightPos - vertPos);
    vec3 R = reflect(-L, N);
    vec3 B = normalize(viewVec);
    
    float lambertian = max(dot(L,N), 0.0);
    float specular = pow(max(dot(R, B), 0.0), shininessVal);
    
    gl_FragColor = vec4(ambientColor*Ka +
                        lambertian*diffuseColor*Kd +
                        specular*specularColor*Ks, 1.0);
    
}
