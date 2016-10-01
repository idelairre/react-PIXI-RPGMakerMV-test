import React from 'react';
import ReactPIXI from 'react-pixi';
import AudioManager from './AudioManager';
import Input from './core/Input';
import Graphics from './Graphics';
import Utils from './Utils';

//-----------------------------------------------------------------------------
// SceneManager
//
// The static class that manages scene transitions.
//-----------------------------------------------------------------------------

export default class SceneManager {

	static _scene = null;
	static _nextScene = null;
	static _stack = [];
	static _stopped = false;
	static _sceneStarted = false;
	static _exiting = false;
	static _previousClass = null;
	static _backgroundBitmap = null;
	static _screenWidth = 816;
	static _screenHeight = 624;
	static _boxWidth = 816;
	static _boxHeight = 624;
	static _deltaTime = 1.0 / 60.0;
	static _currentTime = performance.now();
	static _accumulator = 0.0;

	constructor() {
		throw new Error('This is a static class');
	}

	/*
	 * Gets the current time in ms.
	 * @private
	 */
	static _getTimeInMs() {
		return performance.now();
	}

	static run(sceneClass) {
		try {
			SceneManager.initialize();
			SceneManager.goto(sceneClass);
			// SceneManager.requestUpdate();
		} catch (e) {
			SceneManager.catchException(e);
		}
	}

	static initialize() {
		SceneManager.initGraphics();
		SceneManager.checkFileAccess();
		// SceneManager.initAudio();
		SceneManager.initInput();
		// SceneManager.initNwjs();
		// SceneManager.checkPluginErrors();
		SceneManager.setupErrorHandlers();
	}

	static initGraphics() {
		var type = SceneManager.preferableRendererType();
		Graphics.initialize(SceneManager._screenWidth, SceneManager._screenHeight, type);
		Graphics.boxWidth = SceneManager._boxWidth;
		Graphics.boxHeight = SceneManager._boxHeight;
		Graphics.setLoadingImage('img/system/Loading.png');
		if (Utils.isOptionValid('showfps')) {
			Graphics.showFps();
		}
		if (type === 'webgl') {
			SceneManager.checkWebGL();
		}
	}

	static preferableRendererType() {
		if (Utils.isOptionValid('canvas')) {
			return 'canvas';
		} else if (Utils.isOptionValid('webgl')) {
			return 'webgl';
		} else if (SceneManager.shouldUseCanvasRenderer()) {
			return 'canvas';
		} else {
			return 'auto';
		}
	}

	static shouldUseCanvasRenderer() {
		return Utils.isMobileDevice();
	}

	static checkWebGL() {
		if (!Graphics.hasWebGL()) {
			throw new Error('Your browser does not support WebGL.');
		}
	}

	static checkFileAccess() {
		if (!Utils.canReadGameFiles()) {
			throw new Error('Your browser does not allow to read local files.');
		}
	}

	static initAudio() {
		var noAudio = Utils.isOptionValid('noaudio');
		if (!WebAudio.initialize(noAudio) && !noAudio) {
			throw new Error('Your browser does not support Web Audio API.');
		}
	}

	static initInput() {
		Input.initialize();
		// TouchInput.initialize();
	}

	static initNwjs() {
		if (Utils.isNwjs()) {
			var gui = window.require('nw.gui');
			var win = gui.Window.get();
			if (process.platform === 'darwin' && !win.menu) {
				var menubar = new gui.Menu({
					type: 'menubar'
				});
				var option = {
					hideEdit: true,
					hideWindow: true
				};
				menubar.createMacBuiltin('Game', option);
				win.menu = menubar;
			}
		}
	}

	static checkPluginErrors() {
		PluginManager.checkErrors();
	}

	static setupErrorHandlers() {
		window.addEventListener('error', SceneManager.onError.bind(SceneManager));
		document.addEventListener('keydown', SceneManager.onKeyDown.bind(SceneManager));
	}

	static requestUpdate() {
		if (!SceneManager._stopped) {
			requestAnimationFrame(SceneManager.update.bind(SceneManager));
		}
	}

	static update() {
		try {
			SceneManager.tickStart();
			if (Utils.isMobileSafari()) {
				SceneManager.updateInputData();
			}
			SceneManager.updateMain();
			SceneManager.tickEnd();
		} catch (e) {
			SceneManager.catchException(e);
		}
	}

	static terminate() {
		window.close();
	}

	static onError(e) {
		console.error(e.message);
		console.error(e.filename, e.lineno);
		try {
			SceneManager.stop();
			Graphics.printError('Error', e.message);
			AudioManager.stopAll();
		} catch (e2) {}
	}

	static onKeyDown(event) {
		if (!event.ctrlKey && !event.altKey) {
			switch (event.keyCode) {
				case 116: // F5
					if (Utils.isNwjs()) {
						location.reload();
					}
					break;
				case 119: // F8
					if (Utils.isNwjs() && Utils.isOptionValid('test')) {
						window.require('nw.gui').Window.get().showDevTools();
					}
					break;
			}
		}
	}

	static catchException(e) {
		if (e instanceof Error) {
			Graphics.printError(e.name, e.message);
			console.error(e.stack);
		} else {
			Graphics.printError('UnknownError', e);
		}
		AudioManager.stopAll();
		SceneManager.stop();
	}

	static tickStart() {
		Graphics.tickStart();
	}

	static tickEnd() {
		Graphics.tickEnd();
	}

	static updateInputData() {
		Input.update();
		// TouchInput.update();
	}

	static updateMain() {
		if (Utils.isMobileSafari()) {
			SceneManager.changeScene();
			// SceneManager.updateScene();
		} else {
			var newTime = SceneManager._getTimeInMs();
			var fTime = (newTime - SceneManager._currentTime) / 1000;
			if (fTime > 0.25) fTime = 0.25;
			SceneManager._currentTime = newTime;
			SceneManager._accumulator += fTime;
			while (SceneManager._accumulator >= SceneManager._deltaTime) {
				SceneManager.updateInputData();
				SceneManager.changeScene();
				// SceneManager.updateScene();
				SceneManager._accumulator -= SceneManager._deltaTime;
			}
		}
		SceneManager.renderScene();
		SceneManager.requestUpdate();
	}

	static updateManagers(ticks, delta) {
		ImageManager.cache.update(ticks, delta);
	}

	static changeScene() {
		if (SceneManager.isSceneChanging() && !SceneManager.isCurrentSceneBusy()) {
			if (SceneManager._scene) {
				SceneManager._scene.terminate();
				SceneManager._previousClass = SceneManager._scene.constructor;
			}
			SceneManager._scene = SceneManager._nextScene;
			if (SceneManager._scene) {
				SceneManager._scene.create();
				SceneManager._nextScene = null;
				SceneManager._sceneStarted = false;
				SceneManager.onSceneCreate();
			}
			if (SceneManager._exiting) {
				SceneManager.terminate();
			}
		}
	}

	static updateScene() {
		if (SceneManager._scene) {
			if (!SceneManager._sceneStarted && SceneManager._scene.isReady()) {
				SceneManager._scene.start();
				SceneManager._sceneStarted = true;
				SceneManager.onSceneStart();
			}
			if (SceneManager.isCurrentSceneStarted()) {
				SceneManager._scene.update();
			}
		}
	}

	static renderScene() {
		if (SceneManager.isCurrentSceneStarted()) {
			Graphics.render(SceneManager._scene);
		} else if (SceneManager._scene) {
			SceneManager.onSceneLoading();
		}
	}

	static onSceneCreate() {
		Graphics.startLoading();
	}

	static onSceneStart() {
		Graphics.endLoading();
	}

	static onSceneLoading() {
		Graphics.updateLoading();
	}

	static isSceneChanging() {
		return SceneManager._exiting || !!SceneManager._nextScene;
	}

	static isCurrentSceneBusy() {
		return SceneManager._scene && SceneManager._scene.isBusy();
	}

	static isCurrentSceneStarted() {
		return SceneManager._scene && SceneManager._sceneStarted;
	}

	static isNextScene(sceneClass) {
		return SceneManager._nextScene && SceneManager._nextScene.constructor === sceneClass;
	}

	static isPreviousScene(sceneClass) {
		return SceneManager._previousClass === sceneClass;
	}

	static goto(sceneClass) {
		if (sceneClass) {
			const renderelement = document.getElementById('game');
			const stageElement = sceneClass;
			ReactPIXI.render(React.createElement(stageElement), renderelement);

			// SceneManager._nextScene = new sceneClass();
			// console.log(SceneManager._nextScene.render());
		}
		if (SceneManager._scene) {
			SceneManager._scene.stop();
		}
	}

	static push(sceneClass) {
		SceneManager._stack.push(SceneManager._scene.constructor);
		SceneManager.goto(sceneClass);
	}

	static pop() {
		if (SceneManager._stack.length > 0) {
			SceneManager.goto(SceneManager._stack.pop());
		} else {
			SceneManager.exit();
		}
	}

	static exit() {
		SceneManager.goto(null);
		SceneManager._exiting = true;
	}

	static clearStack() {
		SceneManager._stack = [];
	}

	static stop() {
		SceneManager._stopped = true;
	}

	static prepareNextScene() {
		SceneManager._nextScene.prepare.apply(SceneManager._nextScene, arguments);
	}

	static snap() {
		return Bitmap.snap(SceneManager._scene);
	}

	static snapForBackground() {
		SceneManager._backgroundBitmap = SceneManager.snap();
		SceneManager._backgroundBitmap.blur();
	}

	static backgroundBitmap() {
		return SceneManager._backgroundBitmap;
	}
}
