import React, { Component } from 'react';
import PIXI from 'pixi.js';
import { Stage, Sprite, VectorText } from 'react-pixi';

const SPEED = 0.005;

export default class Cupcake extends Component {
  constructor() {
    super();
    this.state = { rotation: 0 };
  }

  componentDidMount() {
    const tick = () => {
      this.setState({
        rotation: this.state.rotation + Math.PI * SPEED
      });
      requestAnimationFrame(tick);
    };
    tick();
  }

  render() {
    return (
        <Stage>
          <VectorText text={'lol'} />
          <Sprite
            image={require('../assets/cupcake.png')}
            x={400}
            y={300}
            rotation={this.state.rotation}
            pivot={new PIXI.Point(640/2, 577/2)}
          />
        </Stage>
    );
  }
}
