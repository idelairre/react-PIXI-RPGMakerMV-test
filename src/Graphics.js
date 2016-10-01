import React from 'react';
import ReactPIXI from 'react-pixi';
import { render } from 'react-dom';
import App from './App';
import Utils from './Utils';

/**
 * The static class that carries out graphics processing.
 *
 * @class Graphics
 */
 
export default class Graphics {
  constructor() {
    throw new Error('This is a static class');
  }

  /**
	 * The total frame count of the game screen.
	 *
	 * @static
	 * @property frameCount
	 * @type Number
	 */
	static frameCount = 0;

	/**
	 * The alias of PIXI.blendModes.NORMAL.
	 *
	 * @static
	 * @property BLEND_NORMAL
	 * @type Number
	 * @final
	 */
	static BLEND_NORMAL = 0;

	/**
	 * The alias of PIXI.blendModes.ADD.
	 *
	 * @static
	 * @property BLEND_ADD
	 * @type Number
	 * @final
	 */
	static BLEND_ADD = 1;

	/**
	 * The alias of PIXI.blendModes.MULTIPLY.
	 *
	 * @static
	 * @property BLEND_MULTIPLY
	 * @type Number
	 * @final
	 */
	static BLEND_MULTIPLY = 2;

	/**
	 * The alias of PIXI.blendModes.SCREEN.
	 *
	 * @static
	 * @property BLEND_SCREEN
	 * @type Number
	 * @final
	 */
	static BLEND_SCREEN = 3;

	/**
	 * Initializes the graphics system.
	 *
	 * @static
	 * @method initialize
	 * @param {Number} width The width of the game screen
	 * @param {Number} height The height of the game screen
	 * @param {String} type The type of the renderer.
	 *                 'canvas', 'webgl', or 'auto'.
	 */
	static initialize(width, height, type) {
		Graphics._width = width || 800;
		Graphics._height = height || 600;
		Graphics._rendererType = type || 'auto';
		Graphics._boxWidth = Graphics._width;
		Graphics._boxHeight = Graphics._height;

		Graphics._scale = 1;
		Graphics._realScale = 1;

		Graphics._errorPrinter = null;
		Graphics._canvas = null;
		Graphics._video = null;
		Graphics._upperCanvas = null;
		Graphics._renderer = null;
		Graphics._fpsMeter = null;
		Graphics._modeBox = null;
		Graphics._skipCount = 0;
		Graphics._maxSkip = 3;
		Graphics._rendered = false;
		Graphics._loadingImage = null;
		Graphics._loadingCount = 0;
		Graphics._fpsMeterToggled = false;
		Graphics._stretchEnabled = Graphics._defaultStretchMode();

		Graphics._canUseDifferenceBlend = false;
		Graphics._canUseSaturationBlend = false;
		Graphics._hiddenCanvas = null;

		Graphics._testCanvasBlendModes();
		Graphics._modifyExistingElements();
		Graphics._updateRealScale();
		Graphics._createAllElements();
		Graphics._disableTextSelection();
		Graphics._disableContextMenu();
		Graphics._setupEventHandlers();
	}

	/**
	 * Marks the beginning of each frame for FPSMeter.
	 *
	 * @static
	 * @method tickStart
	 */
	static tickStart() {
		if (Graphics._fpsMeter) {
			Graphics._fpsMeter.tickStart();
		}
	}

	/**
	 * Marks the end of each frame for FPSMeter.
	 *
	 * @static
	 * @method tickEnd
	 */
	static tickEnd() {
		if (Graphics._fpsMeter && Graphics._rendered) {
			Graphics._fpsMeter.tick();
		}
	}

	/**
	 * Renders the stage to the game screen.
	 *
	 * @static
	 * @method render
	 * @param {Stage} stage The stage object to be rendered
	 */
	static render(stage) {
		if (Graphics._skipCount === 0) {
			var startTime = Date.now();
			if (stage) {
				Graphics._renderer.render(stage);
			}
			var endTime = Date.now();
			var elapsed = endTime - startTime;
			Graphics._skipCount = Math.min(Math.floor(elapsed / 15), Graphics._maxSkip);
			Graphics._rendered = true;
		} else {
			Graphics._skipCount--;
			Graphics._rendered = false;
		}
		Graphics.frameCount++;
	}

	/**
	 * Checks whether the renderer type is WebGL.
	 *
	 * @static
	 * @method isWebGL
	 * @return {Boolean} True if the renderer type is WebGL
	 */
	static isWebGL() {
		return Graphics._renderer && Graphics._renderer.type === PIXI.RENDERER_TYPE.WEBGL;
	}

	/**
	 * Checks whether the current browser supports WebGL.
	 *
	 * @static
	 * @method hasWebGL
	 * @return {Boolean} True if the current browser supports WebGL.
	 */
	static hasWebGL() {
		try {
			var canvas = document.createElement('canvas');
			return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
		} catch (e) {
			return false;
		}
	}

	/**
	 * Checks whether the canvas blend mode 'difference' is supported.
	 *
	 * @static
	 * @method canUseDifferenceBlend
	 * @return {Boolean} True if the canvas blend mode 'difference' is supported
	 */
	static canUseDifferenceBlend() {
		return Graphics._canUseDifferenceBlend;
	}

	/**
	 * Checks whether the canvas blend mode 'saturation' is supported.
	 *
	 * @static
	 * @method canUseSaturationBlend
	 * @return {Boolean} True if the canvas blend mode 'saturation' is supported
	 */
	static canUseSaturationBlend() {
		return Graphics._canUseSaturationBlend;
	}

	/**
	 * Sets the source of the "Now Loading" image.
	 *
	 * @static
	 * @method setLoadingImage
	 */
	static setLoadingImage(src) {
		// Graphics._loadingImage = new Image();
		// Graphics._loadingImage.src = src;
	}

	/**
	 * Initializes the counter for displaying the "Now Loading" image.
	 *
	 * @static
	 * @method startLoading
	 */
	static startLoading() {
		Graphics._loadingCount = 0;
	}

	/**
	 * Increments the loading counter and displays the "Now Loading" image if necessary.
	 *
	 * @static
	 * @method updateLoading
	 */
	static updateLoading() {
		Graphics._loadingCount++;
		Graphics._paintUpperCanvas();
		Graphics._upperCanvas.style.opacity = 1;
	}

	/**
	 * Erases the "Now Loading" image.
	 *
	 * @static
	 * @method endLoading
	 */
	static endLoading() {
		Graphics._clearUpperCanvas();
		Graphics._upperCanvas.style.opacity = 0;
	}

	/**
	 * Displays the error text to the screen.
	 *
	 * @static
	 * @method printError
	 * @param {String} name The name of the error
	 * @param {String} message The message of the error
	 */
	static printError(name, message) {
		if (Graphics._errorPrinter) {
			Graphics._errorPrinter.innerHTML = Graphics._makeErrorHtml(name, message);
		}
		Graphics._applyCanvasFilter();
		Graphics._clearUpperCanvas();
	}

	/**
	 * Shows the FPSMeter element.
	 *
	 * @static
	 * @method showFps
	 */
	static showFps() {
		if (Graphics._fpsMeter) {
			Graphics._fpsMeter.show();
			Graphics._modeBox.style.opacity = 1;
		}
	}

	/**
	 * Hides the FPSMeter element.
	 *
	 * @static
	 * @method hideFps
	 */
	static hideFps() {
		if (Graphics._fpsMeter) {
			Graphics._fpsMeter.hide();
			Graphics._modeBox.style.opacity = 0;
		}
	}

	/**
	 * Loads a font file.
	 *
	 * @static
	 * @method loadFont
	 * @param {String} name The face name of the font
	 * @param {String} url The url of the font file
	 */
	static loadFont(name, url) {
		var style = document.createElement('style');
		var head = document.getElementsByTagName('head');
		var rule = '@font-face { font-family: "' + name + '"; src: url("' + url + '"); }';
		style.type = 'text/css';
		head.item(0).appendChild(style);
		style.sheet.insertRule(rule, 0);
		Graphics._createFontLoader(name);
	}

	/**
	 * Checks whether the font file is loaded.
	 *
	 * @static
	 * @method isFontLoaded
	 * @param {String} name The face name of the font
	 * @return {Boolean} True if the font file is loaded
	 */
	static isFontLoaded(name) {
		if (!Graphics._hiddenCanvas) {
			Graphics._hiddenCanvas = document.createElement('canvas');
		}
		var context = Graphics._hiddenCanvas.getContext('2d');
		var text = 'abcdefghijklmnopqrstuvwxyz';
		var width1, width2;
		context.font = '40px ' + name + ', sans-serif';
		width1 = context.measureText(text).width;
		context.font = '40px sans-serif';
		width2 = context.measureText(text).width;
		return width1 !== width2;
	}

	/**
	 * Starts playback of a video.
	 *
	 * @static
	 * @method playVideo
	 * @param {String} src
	 */
	static playVideo(src) {
		Graphics._video.src = src;
		Graphics._video.onloadeddata = Graphics._onVideoLoad.bind(Graphics);
		Graphics._video.onerror = Graphics._onVideoError.bind(Graphics);
		Graphics._video.onended = Graphics._onVideoEnd.bind(Graphics);
		Graphics._video.load();
	}

	/**
	 * Checks whether the video is playing.
	 *
	 * @static
	 * @method isVideoPlaying
	 * @return {Boolean} True if the video is playing
	 */
	static isVideoPlaying() {
		return Graphics._video && Graphics._isVideoVisible();
	}

	/**
	 * Checks whether the browser can play the specified video type.
	 *
	 * @static
	 * @method canPlayVideoType
	 * @param {String} type The video type to test support for
	 * @return {Boolean} True if the browser can play the specified video type
	 */
	static canPlayVideoType(type) {
		return Graphics._video && Graphics._video.canPlayType(type);
	}

	/**
	 * Converts an x coordinate on the page to the corresponding
	 * x coordinate on the canvas area.
	 *
	 * @static
	 * @method pageToCanvasX
	 * @param {Number} x The x coordinate on the page to be converted
	 * @return {Number} The x coordinate on the canvas area
	 */
	static pageToCanvasX(x) {
		if (Graphics._canvas) {
			var left = Graphics._canvas.offsetLeft;
			return Math.round((x - left) / Graphics._realScale);
		} else {
			return 0;
		}
	}

	/**
	 * Converts a y coordinate on the page to the corresponding
	 * y coordinate on the canvas area.
	 *
	 * @static
	 * @method pageToCanvasY
	 * @param {Number} y The y coordinate on the page to be converted
	 * @return {Number} The y coordinate on the canvas area
	 */
	static pageToCanvasY(y) {
		if (Graphics._canvas) {
			var top = Graphics._canvas.offsetTop;
			return Math.round((y - top) / Graphics._realScale);
		} else {
			return 0;
		}
	}

	/**
	 * Checks whether the specified point is inside the game canvas area.
	 *
	 * @static
	 * @method isInsideCanvas
	 * @param {Number} x The x coordinate on the canvas area
	 * @param {Number} y The y coordinate on the canvas area
	 * @return {Boolean} True if the specified point is inside the game canvas area
	 */
	static isInsideCanvas(x, y) {
		return (x >= 0 && x < Graphics._width && y >= 0 && y < Graphics._height);
	}

	/**
	 * Calls pixi.js garbage collector
	 */
	static callGC() {
		if (isWebGL()) {
			_renderer.textureGC.run();
		}
	}

	/**
	 * @static
	 * @method _createAllElements
	 * @private
	 */
	static _createAllElements() {
		Graphics._createErrorPrinter();
		Graphics._createCanvas();
		Graphics._createVideo();
		Graphics._createUpperCanvas();
		// Graphics._createRenderer();
		Graphics._createFPSMeter();
		Graphics._createModeBox();
		Graphics._createGameFontLoader();
	}

	/**
	 * @static
	 * @method _updateAllElements
	 * @private
	 */
	static _updateAllElements() {
		Graphics._updateRealScale();
		Graphics._updateErrorPrinter();
		Graphics._updateCanvas();
		Graphics._updateVideo();
		Graphics._updateUpperCanvas();
		Graphics._updateRenderer();
		Graphics._paintUpperCanvas();
	}

	/**
	 * @static
	 * @method _updateRealScale
	 * @private
	 */
	static _updateRealScale() {
		if (Graphics._stretchEnabled) {
			var h = window.innerWidth / Graphics._width;
			var v = window.innerHeight / Graphics._height;
			Graphics._realScale = Math.min(h, v);
		} else {
			Graphics._realScale = Graphics._scale;
		}
	}

	/**
	 * @static
	 * @method _makeErrorHtml
	 * @param {String} name
	 * @param {String} message
	 * @return {String}
	 * @private
	 */
	static _makeErrorHtml(name, message) {
		return ('<font color="yellow"><b>' + name + '</b></font><br>' +
			'<font color="white">' + message + '</font><br>');
	}

	/**
	 * @static
	 * @method _defaultStretchMode
	 * @private
	 */
	static _defaultStretchMode() {
		return Utils.isNwjs() || Utils.isMobileDevice();
	}

	/**
	 * @static
	 * @method _testCanvasBlendModes
	 * @private
	 */
	static _testCanvasBlendModes() {
		var canvas, context, imageData1, imageData2;
		canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		context = canvas.getContext('2d');
		context.globalCompositeOperation = 'source-over';
		context.fillStyle = 'white';
		context.fillRect(0, 0, 1, 1);
		context.globalCompositeOperation = 'difference';
		context.fillStyle = 'white';
		context.fillRect(0, 0, 1, 1);
		imageData1 = context.getImageData(0, 0, 1, 1);
		context.globalCompositeOperation = 'source-over';
		context.fillStyle = 'black';
		context.fillRect(0, 0, 1, 1);
		context.globalCompositeOperation = 'saturation';
		context.fillStyle = 'white';
		context.fillRect(0, 0, 1, 1);
		imageData2 = context.getImageData(0, 0, 1, 1);
		Graphics._canUseDifferenceBlend = imageData1.data[0] === 0;
		Graphics._canUseSaturationBlend = imageData2.data[0] === 0;
	}

	/**
	 * @static
	 * @method _modifyExistingElements
	 * @private
	 */
	static _modifyExistingElements() {
		var elements = document.getElementsByTagName('*');
		for (var i = 0; i < elements.length; i++) {
			if (elements[i].style.zIndex > 0) {
				elements[i].style.zIndex = 0;
			}
		}
	}

	/**
	 * @static
	 * @method _createErrorPrinter
	 * @private
	 */
	static _createErrorPrinter() {
		Graphics._errorPrinter = document.createElement('p');
		Graphics._errorPrinter.id = 'ErrorPrinter';
		Graphics._updateErrorPrinter();
		document.body.appendChild(Graphics._errorPrinter);
	}

	/**
	 * @static
	 * @method _updateErrorPrinter
	 * @private
	 */
	static _updateErrorPrinter() {
		Graphics._errorPrinter.width = Graphics._width * 0.9;
		Graphics._errorPrinter.height = 40;
		Graphics._errorPrinter.style.textAlign = 'center';
		Graphics._errorPrinter.style.textShadow = '1px 1px 3px #000';
		Graphics._errorPrinter.style.fontSize = '20px';
		Graphics._errorPrinter.style.zIndex = 99;
		Graphics._centerElement(Graphics._errorPrinter);
	}

	/**
	 * @static
	 * @method _createCanvas
	 * @private
	 */
	static _createCanvas() {
    const renderelement = document.getElementById('game');
    const stageElement = <App />;
    ReactPIXI.render(stageElement, renderelement);
		Graphics._canvas = document.getElementsByTagName('canvas')[0];
		Graphics._updateCanvas();
	}

	/**
	 * @static
	 * @method _updateCanvas
	 * @private
	 */
	static _updateCanvas() {
		Graphics._canvas.width = Graphics._width;
		Graphics._canvas.height = Graphics._height;
		Graphics._canvas.style.zIndex = 1;
		Graphics._centerElement(Graphics._canvas);
	}

	/**
	 * @static
	 * @method _createVideo
	 * @private
	 */
	static _createVideo() {
		Graphics._video = document.createElement('video');
		Graphics._video.id = 'GameVideo';
		Graphics._video.style.opacity = 0;
		Graphics._updateVideo();
		document.body.appendChild(Graphics._video);
	}

	/**
	 * @static
	 * @method _updateVideo
	 * @private
	 */
	static _updateVideo() {
		Graphics._video.width = Graphics._width;
		Graphics._video.height = Graphics._height;
		Graphics._video.style.zIndex = 2;
		Graphics._centerElement(Graphics._video);
	}

	/**
	 * @static
	 * @method _createUpperCanvas
	 * @private
	 */
	static _createUpperCanvas() {
		Graphics._upperCanvas = document.createElement('canvas');
		Graphics._upperCanvas.id = 'UpperCanvas';
		Graphics._updateUpperCanvas();
		document.body.appendChild(Graphics._upperCanvas);
	}

	/**
	 * @static
	 * @method _updateUpperCanvas
	 * @private
	 */
	static _updateUpperCanvas() {
		Graphics._upperCanvas.width = Graphics._width;
		Graphics._upperCanvas.height = Graphics._height;
		Graphics._upperCanvas.style.zIndex = 3;
		Graphics._centerElement(Graphics._upperCanvas);
	}

	/**
	 * @static
	 * @method _clearUpperCanvas
	 * @private
	 */
	static _clearUpperCanvas() {
		var context = Graphics._upperCanvas.getContext('2d');
		context.clearRect(0, 0, Graphics._width, Graphics._height);
	}

	/**
	 * @static
	 * @method _paintUpperCanvas
	 * @private
	 */
	static _paintUpperCanvas() {
		Graphics._clearUpperCanvas();
		if (Graphics._loadingImage && Graphics._loadingCount >= 20) {
			var context = Graphics._upperCanvas.getContext('2d');
			var dx = (Graphics._width - Graphics._loadingImage.width) / 2;
			var dy = (Graphics._height - Graphics._loadingImage.height) / 2;
			var alpha = ((Graphics._loadingCount - 20) / 30).clamp(0, 1);
			context.save();
			context.globalAlpha = alpha;
			context.drawImage(Graphics._loadingImage, dx, dy);
			context.restore();
		}
	}

	/**
	 * @static
	 * @method _createRenderer
	 * @private
	 */
	static _createRenderer() {
		PIXI.dontSayHello = true;
		var width = Graphics._width;
		var height = Graphics._height;
		var options = {
			view: Graphics._canvas
		};
		try {
			switch (Graphics._rendererType) {
				case 'canvas':
					Graphics._renderer = new PIXI.CanvasRenderer(width, height, options);
					break;
				case 'webgl':
					Graphics._renderer = new PIXI.WebGLRenderer(width, height, options);
					break;
				default:
					Graphics._renderer = PIXI.autoDetectRenderer(width, height, options);
					break;
			}
		} catch (e) {
			Graphics._renderer = null;
		}
	}

	/**
	 * @static
	 * @method _updateRenderer
	 * @private
	 */
	static _updateRenderer() {
		if (Graphics._renderer) {
			Graphics._renderer.resize(Graphics._width, Graphics._height);
		}
	}

	/**
	 * @static
	 * @method _createFPSMeter
	 * @private
	 */
	static _createFPSMeter() {
		var options = {
			graph: 1,
			decimals: 0,
			theme: 'transparent',
			toggleOn: null
		};
		Graphics._fpsMeter = new FPSMeter(options);
		Graphics._fpsMeter.hide();
	}

	/**
	 * @static
	 * @method _createModeBox
	 * @private
	 */
	static _createModeBox() {
		var box = document.createElement('div');
		box.id = 'modeTextBack';
		box.style.position = 'absolute';
		box.style.left = '5px';
		box.style.top = '5px';
		box.style.width = '119px';
		box.style.height = '58px';
		box.style.background = 'rgba(0,0,0,0.2)';
		box.style.zIndex = 9;
		box.style.opacity = 0;

		var text = document.createElement('div');
		text.id = 'modeText';
		text.style.position = 'absolute';
		text.style.left = '0px';
		text.style.top = '41px';
		text.style.width = '119px';
		text.style.fontSize = '12px';
		text.style.fontFamily = 'monospace';
		text.style.color = 'white';
		text.style.textAlign = 'center';
		text.style.textShadow = '1px 1px 0 rgba(0,0,0,0.5)';
		text.innerHTML = Graphics.isWebGL() ? 'WebGL mode' : 'Canvas mode';

		document.body.appendChild(box);
		box.appendChild(text);

		Graphics._modeBox = box;
	}

	/**
	 * @static
	 * @method _createGameFontLoader
	 * @private
	 */
	static _createGameFontLoader() {
		Graphics._createFontLoader('GameFont');
	}

	/**
	 * @static
	 * @method _createFontLoader
	 * @param {String} name
	 * @private
	 */
	static _createFontLoader(name) {
		var div = document.createElement('div');
		var text = document.createTextNode('.');
		div.style.fontFamily = name;
		div.style.fontSize = '0px';
		div.style.color = 'transparent';
		div.style.position = 'absolute';
		div.style.margin = 'auto';
		div.style.top = '0px';
		div.style.left = '0px';
		div.style.width = '1px';
		div.style.height = '1px';
		div.appendChild(text);
		document.body.appendChild(div);
	}

	/**
	 * @static
	 * @method _centerElement
	 * @param {HTMLElement} element
	 * @private
	 */
	static _centerElement(element) {
		var width = element.width * Graphics._realScale;
		var height = element.height * Graphics._realScale;
		element.style.position = 'absolute';
		element.style.margin = 'auto';
		element.style.top = 0;
		element.style.left = 0;
		element.style.right = 0;
		element.style.bottom = 0;
		element.style.width = width + 'px';
		element.style.height = height + 'px';
	}

	/**
	 * @static
	 * @method _disableTextSelection
	 * @private
	 */
	static _disableTextSelection() {
		var body = document.body;
		body.style.userSelect = 'none';
		body.style.webkitUserSelect = 'none';
		body.style.msUserSelect = 'none';
		body.style.mozUserSelect = 'none';
	}

	/**
	 * @static
	 * @method _disableContextMenu
	 * @private
	 */
	static _disableContextMenu() {
		var elements = document.body.getElementsByTagName('*');
		var oncontextmenu = () => {
			return false;
		};
		for (var i = 0; i < elements.length; i++) {
			elements[i].oncontextmenu = oncontextmenu;
		}
	}

	/**
	 * @static
	 * @method _applyCanvasFilter
	 * @private
	 */
	static _applyCanvasFilter() {
		if (Graphics._canvas) {
			Graphics._canvas.style.opacity = 0.5;
			Graphics._canvas.style.filter = 'blur(8px)';
			Graphics._canvas.style.webkitFilter = 'blur(8px)';
		}
	}

	/**
	 * @static
	 * @method _onVideoLoad
	 * @private
	 */
	static _onVideoLoad() {
		Graphics._video.play();
		Graphics._updateVisibility(true);
	}

	/**
	 * @static
	 * @method _onVideoError
	 * @private
	 */
	static _onVideoError() {
		Graphics._updateVisibility(false);
	}

	/**
	 * @static
	 * @method _onVideoEnd
	 * @private
	 */
	static _onVideoEnd() {
		Graphics._updateVisibility(false);
	}

	/**
	 * @static
	 * @method _updateVisibility
	 * @param {Boolean} videoVisible
	 * @private
	 */
	static _updateVisibility(videoVisible) {
		Graphics._video.style.opacity = videoVisible ? 1 : 0;
		Graphics._canvas.style.opacity = videoVisible ? 0 : 1;
	}

	/**
	 * @static
	 * @method _isVideoVisible
	 * @return {Boolean}
	 * @private
	 */
	static _isVideoVisible() {
		return Graphics._video.style.opacity > 0;
	}

	/**
	 * @static
	 * @method _setupEventHandlers
	 * @private
	 */
	static _setupEventHandlers() {
		window.addEventListener('resize', Graphics._onWindowResize.bind(Graphics));
		document.addEventListener('keydown', Graphics._onKeyDown.bind(Graphics));
	}

	/**
	 * @static
	 * @method _onWindowResize
	 * @private
	 */
	static _onWindowResize() {
		Graphics._updateAllElements();
	}

	/**
	 * @static
	 * @method _onKeyDown
	 * @param {KeyboardEvent} event
	 * @private
	 */
	static _onKeyDown(event) {
		if (!event.ctrlKey && !event.altKey) {
			switch (event.keyCode) {
				case 113: // F2
					event.preventDefault();
					Graphics._switchFPSMeter();
					break;
				case 114: // F3
					event.preventDefault();
					Graphics._switchStretchMode();
					break;
				case 115: // F4
					event.preventDefault();
					Graphics._switchFullScreen();
					break;
			}
		}
	}

	/**
	 * @static
	 * @method _switchFPSMeter
	 * @private
	 */
	static _switchFPSMeter() {
		if (Graphics._fpsMeter.isPaused) {
			Graphics.showFps();
			Graphics._fpsMeter.showFps();
			Graphics._fpsMeterToggled = false;
		} else if (!Graphics._fpsMeterToggled) {
			Graphics._fpsMeter.showDuration();
			Graphics._fpsMeterToggled = true;
		} else {
			Graphics.hideFps();
		}
	}

	/**
	 * @static
	 * @method _switchStretchMode
	 * @return {Boolean}
	 * @private
	 */
	static _switchStretchMode() {
		Graphics._stretchEnabled = !Graphics._stretchEnabled;
		Graphics._updateAllElements();
	}

	/**
	 * @static
	 * @method _switchFullScreen
	 * @private
	 */
	static _switchFullScreen() {
		if (Graphics._isFullScreen()) {
			Graphics._requestFullScreen();
		} else {
			Graphics._cancelFullScreen();
		}
	}

	/**
	 * @static
	 * @method _isFullScreen
	 * @return {Boolean}
	 * @private
	 */
	static _isFullScreen() {
		return ((document.fullScreenElement && document.fullScreenElement !== null) ||
			(!document.mozFullScreen && !document.webkitFullscreenElement &&
				!document.msFullscreenElement));
	}

	/**
	 * @static
	 * @method _requestFullScreen
	 * @private
	 */
	static _requestFullScreen() {
		var element = document.body;
		if (element.requestFullScreen) {
			element.requestFullScreen();
		} else if (element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else if (element.webkitRequestFullScreen) {
			element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		} else if (element.msRequestFullscreen) {
			element.msRequestFullscreen();
		}
	}

	/**
	 * @static
	 * @method _cancelFullScreen
	 * @private
	 */
	static _cancelFullScreen() {
		if (document.cancelFullScreen) {
			document.cancelFullScreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitCancelFullScreen) {
			document.webkitCancelFullScreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
	}
}

/**
 * The width of the game screen.
 *
 * @static
 * @property width
 * @type Number
 */
Object.defineProperty(Graphics, 'width', {
	get() {
		return Graphics._width;
	},
	set(value) {
		if (Graphics._width !== value) {
			Graphics._width = value;
			Graphics._updateAllElements();
		}
	},
	configurable: true
});

/**
 * The height of the game screen.
 *
 * @static
 * @property height
 * @type Number
 */
Object.defineProperty(Graphics, 'height', {
	get() {
		return Graphics._height;
	},
	set(value) {
		if (Graphics._height !== value) {
			Graphics._height = value;
			Graphics._updateAllElements();
		}
	},
	configurable: true
});

/**
 * The width of the window display area.
 *
 * @static
 * @property boxWidth
 * @type Number
 */
Object.defineProperty(Graphics, 'boxWidth', {
	get() {
		return Graphics._boxWidth;
	},
	set(value) {
		Graphics._boxWidth = value;
	},
	configurable: true
});

/**
 * The height of the window display area.
 *
 * @static
 * @property boxHeight
 * @type Number
 */
Object.defineProperty(Graphics, 'boxHeight', {
	get() {
		return Graphics._boxHeight;
	},
	set(value) {
		Graphics._boxHeight = value;
	},
	configurable: true
});

/**
 * The zoom scale of the game screen.
 *
 * @static
 * @property scale
 * @type Number
 */
Object.defineProperty(Graphics, 'scale', {
	get() {
		return Graphics._scale;
	},
	set(value) {
		if (Graphics._scale !== value) {
			Graphics._scale = value;
			Graphics._updateAllElements();
		}
	},
	configurable: true
});
