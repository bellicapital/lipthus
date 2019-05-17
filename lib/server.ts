import {KeyString} from "../interfaces/global.interface";


const exec = require("child_process").exec;
const debug = require('debug')('site:server');

const commands = [
	{
		k: "mediainfo",
		uri: 'https://mediaarea.net/en/MediaInfo/Download'
	},
	{
		k: "gm",
		uri: 'http://www.graphicsmagick.org/',
		install: 'graphicsmagick'
	}
	// {
	// 	k: "magick",
	// 	uri: 'https://www.imagemagick.org/',
	// 	install: 'imagemagick'
	// },
	// {
	// 	k: "ffmpeg",
	// 	install: 'ffmpeg'
	// }
];

const installers: KeyString = {
	ubuntu: 'sudo apt install %s',
	darwin: 'brew install %s'
};

const install = installers[process.platform];
let count = 0;

commands.forEach((cmd: any) => {
	exec("which " + cmd.k, (err: Error) => {
		if (err) {
			if (install) {
				const cmdStr = install.replace('%s', cmd.install || cmd.k);

				exec(cmdStr, (err2: Error) => {
					if (err2)
						throw err2;
				});
			} else
				throw new Error(cmd.k + " not installed\n\t" + cmd.uri);
		}

		if (++count === commands.length)
			debug('status: ok');
	});
});
