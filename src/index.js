import React from 'react';
import { render } from 'react-dom';
import ReactPIXI from 'react-pixi';
import App from './App';
import Cupcake from './Cupcake';
import Graphics from './Graphics';
import SceneManager from './SceneManager';
import './core/jsExtensions';
import 'script!./core/FPSMeter';


SceneManager.run(App);
