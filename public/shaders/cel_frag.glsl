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
    float specular = max(dot(R, B), 0.0)*shininessVal;
    vec3 vertex_color = ambientColor*Ka + diffuseColor*Kd;
    vec3 color;

    if (lambertian > 0.995) {
        color = specularColor*Ks;
    } else if (lambertian > 0.6) {
        color = vertex_color;
    } else if (lambertian > 0.3) {
        color = vertex_color * 0.7;
    } else if (lambertian > 0.03) {
        color = vertex_color * 0.35;
    } else {
        color = vertex_color * 0.2;
    }
    gl_FragColor = vec4(color, 1.0);
    
}
