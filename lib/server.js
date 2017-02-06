"use strict";

const exec = require("child_process").exec;
const debug = require('debug')('site:server');
const install = 'sudo apt-get install ';

module.exports = {
	check: function(){
//		if(process.platform === 'darwin')
//			console.warn("  \u001b[33m warn  -\u001b[0m No se ha implementado la subida de videos en OSX");

		return new Promise((ok, ko) => {
			const cmds = [
				{
					k: "mediainfo",
					uri: 'https://mediaarea.net/en/MediaInfo/Download'
				},
				{
					k: "gm",
					uri: 'http://www.graphicsmagick.org/',
					install: 'graphicsmagick'
				},
				{
					k: "avconv",
					uri: 'https://libav.org/',
					install: 'libav'
				}
				//			,{
				//				k: "gd",
				//				uri: 'http://www.boutell.com/gd/',
				//				install: process.platform === 'darwin' ? 'libgd2-xpm-dev' : 'gd'
				//			}
			];

			let installers = {
				ubuntu: 'sudo apt-get install %s',
				darwin: 'brew install %s'
			};

			const install = installers[process.platform];
			let count = 0;
			let ended;

			installers = null;

			cmds.forEach(function (cmd) {
				exec("which " + cmd.k, function (err) {
					if (err) {
						let msg = cmd.k + " not installed\n\t" + cmd.uri;

						if (install)
							msg += "\n\tTry: " + install.replace('%s', cmd.install || cmd.k);

						console.error(new Error(msg));
					}

					if (++count === cmds.length)
						ok();
				});
			});
		});
	}
};