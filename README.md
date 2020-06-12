# node-red-contrib-sox-utils

```
!!!this is very much wip, so use with care!!!
```

a simple node-red wrapper around some of the record and play functionality of the [sox commandline utility](http://sox.sourceforge.net/) on linux

# Prerequisites

This node is made to work with the [sox commandline utility](http://sox.sourceforge.net/) and the [Alsa the Advanced Linux Sound Architecture](https://alsa-project.org/wiki/Main_Page) on linux. To use it you will have to install sox. This can be done with the command `sudo apt-get install sox` from the commandline of the machine that node-red is running on.
Once you have sox installed you can install the node by running the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install johanneskropf/node-red-contrib-sox-record
```
Now restart nodered and it should appear in the input category of your palette.

# Basic usage

## Record Node

The node starts recording with the specified settings from the choosen source when it receives a `msg.payload` with the content of `start`.
To stop recording at any time send a `msg.payload` of `stop`.

The node has two outputs.
All audio data will be send to the first output in form of audio buffers. You can specify in the node settings if the node should send a stream of raw buffers while recording or either a single raw buffer or a single wav buffer when the recording finished or was stopped.
On the second output you will receive a `msg.payload` of `starting` when the recording starts and `complete` when finished. You will also receive any errors or warnings of the sox process that may occur.
If you select the option for detailed debug output you will also receive detailed recording progress info from the sox process while recording.

You can either set the node to record until you stop it or set a specified duration to record and than stop automatically. The duration needs to be put in as seconds. Even when set to record for a specified duration you can still stop the recording at any time with a `msg.payload` of `stop`.

The node also supports the sox silence detection functionality. You can set the node to stop recording on silence. If you select this option you will have to enter a threshold value and a silence duration. The threshold value determines below which volume threshold in percent the samples should be counted as silence. The duration value determins how long the audio has to be below the silence threshold to stop recording.

You can combine both silence detection and max record duration or use either independent of each other.

If in single wav buffer output mode you can write the resulting buffer directly to a file using a file node or play it using the sox-play node which accepts a wav buffer as an input.

## Play Node

The play node will play an audio file (*Note: If you want to play mp3's with sox you will have to install a handler for this, for example with:*`sudo apt-get install libsox-fmt-mp3`) which was send to the node as either a string containing a path in the `msg.payload` or as a single buffer containing the data in the `msg.payload`. It will try to play the audio on the selected output from the nodes menu. If you select the detailed info option it will send detailed playback progress and information to the output. When finished it will always send a `msg.payload` of `complete`.
You can stop playback at anytime with a `msg.payload` of `stop`.
The node can behave in two ways when a new input arrives while a playback is in progress. The behavior can be set in the nodes options. You can choose if it should either ignore the new input or stop the current playback and replace it with the new input.
