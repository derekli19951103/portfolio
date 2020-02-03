import React from "react";
import { Grid, Image, Modal, Responsive } from "semantic-ui-react";
import "../styles/Detail.css";

class Lightbox extends React.Component {
  state = { open: false };

  handleOpen = () => this.setState({ open: true });

  handleClose = () => this.setState({ open: false });

  render() {
    const { src } = this.props;
    return (
      <Modal
        trigger={<Image src={src} />}
        basic
        size={"large"}
        open={this.state.open}
        onOpen={this.handleOpen}
        onClose={this.handleClose}
      >
        <Modal.Content>
          <Image src={src} />
        </Modal.Content>
      </Modal>
    );
  }
}

export class Detail extends React.Component {
  render() {
    const { details } = this.props;
    const unpadded = {
      paddingTop: "0px",
      paddingLeft: "0px",
      paddingBottom: "0px",
      paddingRight: "0px"
    };
    let items = [];
    for (let i = 0; i < details.length; i++) {
      if (i % 2 == 0) {
        items.push(
          <Grid.Row key={i}>
            <Grid.Column width={8} style={unpadded}>
              <Lightbox src={this.props.details[i].pic} />
            </Grid.Column>
            <Grid.Column width={8} className={"left"}>
              <h1 style={{ fontFamily: "'Roboto', sans-serif" }}>
                {this.props.details[i].desc}
              </h1>
            </Grid.Column>
          </Grid.Row>
        );
      } else {
        items.push(
          <Grid.Row key={i}>
            <Grid.Column width={8} className={"right"}>
              <h1 style={{ fontFamily: "'Roboto', sans-serif" }}>
                {this.props.details[i].desc}
              </h1>
            </Grid.Column>
            <Grid.Column width={8} style={unpadded}>
              <Lightbox src={this.props.details[i].pic} />
            </Grid.Column>
          </Grid.Row>
        );
      }
    }
    return (
      <div>
        <Responsive minWidth={768}>
          <Grid
            style={{
              position: "relative",
              top: "100px",
              paddingBottom: "200px"
            }}
            stackable
            celled
          >
            {items}
          </Grid>
        </Responsive>
        <Responsive maxWidth={767}>
          <Grid
            style={{
              position: "relative",
              top: "100px",
              paddingBottom: "200px"
            }}
            stackable
          >
            {details.map(d => (
              <Grid.Row key={d.desc}>
                <Grid.Column width={8} className={"left"}>
                  <h3 style={{ fontFamily: "'Roboto', sans-serif" }}>
                    {d.desc}
                  </h3>
                </Grid.Column>
                <Grid.Column width={8}>
                  <Lightbox src={d.pic} />
                </Grid.Column>
              </Grid.Row>
            ))}
          </Grid>
        </Responsive>
      </div>
    );
  }
}
