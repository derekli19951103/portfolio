import React from "react";
import { Text, TitleBar, Window } from "react-desktop/macOs";
import { Grid } from "semantic-ui-react";
import "../styles/Skills.css";

const Skills = () => {
  return (
    <div id={"Skills"}>
      <Grid columns={3} stackable centered stretched className={"gridSkill"}>
        <Grid.Column>
          <Window
            chrome
            height="100%"
            width="100%"
            padding="10px"
            background="rgb(38,50,56)"
          >
            <TitleBar title="Python" controls />
            <span>
              <Text color="white">import pytorch</Text>
              <Text color="white">import cv2</Text>
              <Text color="white">import numpy</Text>
              <Text color="white">import matplotlib</Text>
            </span>
          </Window>
          <br></br>
          <Window
            chrome
            height="100%"
            width="100%"
            padding="10px"
            background="rgb(38,50,56)"
          >
            <TitleBar title="Swift" controls />
            <span>
              <Text color="white">Swift 4+</Text>
              <Text color="white">CoreData</Text>
              <Text color="white">Cocoapod</Text>
              <Text color="white">DispatchGroup</Text>
              <Text color="white">xib</Text>
            </span>
          </Window>
        </Grid.Column>
        <Grid.Column>
          <Window
            chrome
            height="100%"
            width="100%"
            padding="10px"
            background="rgb(38,50,56)"
          >
            <TitleBar title="Web" controls />
            <span>
              <Text color="white">{"<html>"}</Text>
              <Text color="white" paddingLeft="20px">
                {"<head></head>"}
              </Text>
              <Text color="white" paddingLeft="20px">
                {"<body>"}
              </Text>
              <Text color="white" paddingLeft="40px">
                {"<ul>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>Javascript(Typescript)</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>JQeury</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>Angular</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>React</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>Redux</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>Express</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>MongoDB</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>Webpack</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>Babel</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>CSS3</li>"}
              </Text>
              <Text color="white" paddingLeft="60px">
                {"<li>HTML5</li>"}
              </Text>
              <Text color="white" paddingLeft="40px">
                {"</ul>"}
              </Text>
              <Text color="white" paddingLeft="20px">
                {"</body>"}
              </Text>
              <Text color="white">{"</html>"}</Text>
            </span>
          </Window>
        </Grid.Column>
        <Grid.Column>
          <Window
            chrome
            height="30%"
            width="100%"
            padding="10px"
            background="rgb(38,50,56)"
          >
            <TitleBar title="Java" controls />
            <span>
              <Text color="white">import javax.swing.JFrame;</Text>
              <Text color="white">import org.springframework.data;</Text>
              <Text color="white">import javax.persistence;</Text>
              <Text color="white">import org.springframework.web;</Text>
            </span>
          </Window>
          <br></br>
          <Window
            chrome
            height="20%"
            width="100%"
            padding="10px"
            background="rgb(38,50,56)"
          >
            <TitleBar title="Database" controls />
            <span>
              <Text color="white">
                MongoDB with Java Spring, Express Node.js
              </Text>
              <Text color="white">mySQL with Java Spring</Text>
              <Text color="white">redis with Java Spring</Text>
            </span>
          </Window>
          <br></br>
          <Window
            chrome
            height="10%"
            width="100%"
            padding="10px"
            background="rgb(38,50,56)"
          >
            <TitleBar title="Others" controls />
            <span>
              <Text color="white">Matlab, R, Racket, C, C++</Text>
            </span>
          </Window>
        </Grid.Column>
      </Grid>
    </div>
  );
};

export default Skills;
