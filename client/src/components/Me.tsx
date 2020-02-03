import React from "react";
import "../styles/Me.css";
import { BRIEF } from "../data";
import Particles from "react-particles-js";

export const Me = () => {
  return (
    <div id={"particles"}>
      <Particles
        params={{
          particles: {
            number: {
              value: 240,
              density: {
                enable: true,
                value_area: 1500
              }
            },
            line_linked: {
              enable: true,
              opacity: 0.02
            },
            move: {
              direction: "right",
              speed: 1
            },
            size: {
              value: 1
            },
            opacity: {
              anim: {
                enable: true,
                speed: 1,
                opacity_min: 0.05
              }
            }
          },
          interactivity: {
            events: {
              onclick: {
                enable: true,
                mode: "push"
              }
            },
            modes: {
              push: {
                particles_nb: 1
              }
            }
          },
          retina_detect: true
        }}
      />
      <div id={"Me"}>
        <span>
          <h1>{BRIEF.header}</h1>
          <h4>{BRIEF.desc}</h4>
        </span>
      </div>
    </div>
  );
};
