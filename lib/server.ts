import {KeyString} from "../interfaces/global.interface";
import * as fs from "fs";
import {promisify} from "util";

const mkdir = promisify(fs.mkdir);

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


// to deprecate

function mkCacheDir(f: string) {
	fs.access(f, fs.constants.W_OK | fs.constants.R_OK, (err) => {
		if (!err)
			return;

		debug('/var/cache/video-versions does not exists');

		Promise.resolve()
			.then(() => {
				if (!fs.existsSync('/var/cache'))
					return mkdir('/var/cache');
			})
			.then(() => {
				if (!fs.existsSync(f))
					return mkdir(f, {recursive: true});

			})
			.then(() => fs.chmod(f, 0o666, err2 => {
				if (err2)
					throw err2;
			}))
			.catch(err3 => console.error('Can\'t create ' + f + ' directory', err3.message));
	});
}

mkCacheDir('/var/cache/video-versions');

