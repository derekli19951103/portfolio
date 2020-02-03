import React from "react";
import { CONTACT } from "../data";
import { useLanguage } from "../hooks/language";
import "../styles/Contact.css";
import "../styles/btn-cont.css";

export const Contact = () => {
  const lang = useLanguage();
  return (
    <div id={"Contact"}>
      <span>
        <div id={"info"}>
          <div className="btn-cont">
            <a className="btn" href={"mailto:" + CONTACT.email}>
              {lang == "en" ? "Email Me" : "电邮联系"}
              <span className="line-1"></span>
              <span className="line-2"></span>
              <span className="line-3"></span>
              <span className="line-4"></span>
            </a>
          </div>
          <div className="btn-cont">
            <a className="btn" href={"tel:" + CONTACT.tel}>
              {lang == "en" ? "Call Me" : "电话联系"}
              <span className="line-1"></span>
              <span className="line-2"></span>
              <span className="line-3"></span>
              <span className="line-4"></span>
            </a>
          </div>

          <h2 style={{ position: "relative", top: "-20px" }}>
            <a href={"https://www.linkedin.com/in/yufeng-li-567a3517a/"}>
              <i className="fab fa-linkedin"></i>
            </a>{" "}
            <a href={"https://github.com/derekli19951103"}>
              <i className="fab fa-github"></i>
            </a>
          </h2>
        </div>
      </span>
    </div>
  );
};
