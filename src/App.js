import React, { Component } from 'react';
import { Stage, Sprite, Text } from 'react-pixi';

const SPEED = 0.005;

export default class App extends Component {
  constructor() {
    super();
    this.isReady = true;
  }

  render() {
    return (
      <Stage>
        <Text text={'lol'} />
      </Stage>
    )
  }
}
