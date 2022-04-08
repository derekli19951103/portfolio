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

// HINT: Use the built-in variable gl_FragCoord to get the screen-space coordinates

void main() {
  // Your solution should go here.
  // Only the background color calculations have been provided as an example.
    vec3 N = normalize(normalInterp);
    vec3 L = normalize(lightPos - vertPos);
    vec3 R = reflect(-L, N);
    vec3 B = normalize(viewVec);
    float lambertian = max(dot(L,N), 0.0);
    vec3 ambient = ambientColor*Ka;
    vec3 diffuse = diffuseColor*Kd;
    vec2 pixel = floor(gl_FragCoord.xy);
    float frequency = 10.0;
    vec2 change_in_pixel = mod(pixel,vec2(frequency));
    float intensity = distance(change_in_pixel,vec2(frequency/2.0)) / (frequency * 0.6);
    if(intensity>0.0){
        intensity += (diffuse.r + diffuse.b + diffuse.g)*lambertian;
    }
    intensity = clamp(pow(intensity,frequency),0.0,1.0);
//    if you want to do things inversely
//    float circle = clamp(1.0/pow(radius,frequency),0.0,1.0);
    gl_FragColor = vec4((ambient+diffuse)*intensity , 1.0);
    
    
}
