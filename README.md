## What's lipthus

cmjs is a content managing system

## Usage

## Chrome extension

https://chrome.google.com/webstore/detail/euca-dev-cmjs/agheanocccieciejhnjdadpfjomcniid


## Ojo!

27/10/16

JJ ha modificado este archivo:

node_modules/crc/lib/crc32.js

añadido new para evitar el deprecation warning de nodejs 7.0

  if (!_buffer.Buffer.isBuffer(buf)) buf = new (0, _buffer.Buffer)(buf);
