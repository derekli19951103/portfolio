varying vec3 normalInterp;
varying vec3 vertPos;
varying vec3 viewVec;

uniform float Ka; 
uniform float Kd;
uniform float Ks;
uniform float shininessVal;

uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;

uniform vec3 lightPos;

void main() {
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
