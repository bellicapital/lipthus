const exec = require("child_process").exec;
const debug = require('debug')('site:server');

// 		if(process.platform === 'darwin')
// 			console.warn("  \u001b[33m warn  -\u001b[0m No se ha implementado la subida de videos en OSX");

const commands = [
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
	// 			,{
	// 				k: "gd",
	// 				uri: 'http://www.boutell.com/gd/',
	// 				install: process.platform === 'darwin' ? 'libgd2-xpm-dev' : 'gd'
	// 			}
];

let installers = {
	ubuntu: 'sudo apt-get install %s',
	darwin: 'brew install %s'
};

const install = installers[process.platform];
let count = 0;

commands.forEach((cmd: any) => {
	exec("which " + cmd.k, (err: Error) => {
		if (err) {
			let msg = cmd.k + " not installed\n\t" + cmd.uri;
			
			if (install)
				msg += "\n\tTry: " + install.replace('%s', cmd.install || cmd.k);
			
			throw new Error(msg);
		}
		
		if (++count === commands.length)
			debug('status: ok');
	});
});
