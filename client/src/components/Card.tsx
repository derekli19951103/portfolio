import React from "react";
import "../styles/Card.css";

interface IProp {
  picture: string;
  toptitle: string;
  midtitle: string;
  lowtitle: string;
  desc: string;
  href: string;
  mask: string;
}

const Card = (props: IProp) => {
  const { picture, toptitle, midtitle, lowtitle, desc, href, mask } = props;
  const alphaStyle = {
    fill: "white"
  };
  const baseStyle = {
    fill: "white",
    WebkitMask: "url(#" + mask + ")",
    mask: "url(#" + mask + ")"
  };
  return (
    <div className="container-fluid">
      <figure>
        <div className="media" style={{ backgroundImage: picture }}></div>
        <figcaption>
          <svg
            viewBox="0 0 200 200"
            version="1.1"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id={mask} x="0" y="0" width="100%" height="100%">
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  style={alphaStyle}
                ></rect>
                <text className="title" dx="50%" dy="2.5em">
                  {toptitle}
                </text>
                <text className="title" dx="50%" dy="3.5em">
                  {midtitle}
                </text>
                <text className="title" dx="50%" dy="4.5em">
                  {lowtitle}
                </text>
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              style={baseStyle}
            ></rect>
          </svg>
          <div className="body">
            <p>{desc}</p>
          </div>
        </figcaption>
        {/* <a href={href}></a> */}
      </figure>
    </div>
  );
};

export default Card;
