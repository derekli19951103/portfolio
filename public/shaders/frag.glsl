uniform float flash;

			varying vec3 vNormal;
			varying vec3 vColor;

			void main() {

				const float ambient = 0.4;

				vec3 light = vec3( 1.0 );
				light = normalize( light );

				float directional = max( dot( vNormal, light ), 0.0 );

				// A flash lights the whole letter past white, for the bloom to halo
				gl_FragColor = vec4( ( directional + ambient ) * vColor + flash, 1.0 );

			}