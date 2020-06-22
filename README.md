# node-red-contrib-sox-utils

```
!!!this is very much wip, so use with care!!!
```

a simple node-red wrapper around some of the record and play functionality of the [sox commandline utility](http://sox.sourceforge.net/) on linux

# Prerequisites

This node is made to work with the [sox commandline utility](http://sox.sourceforge.net/) and [the Advanced Linux Sound Architecture (ALSA)](https://alsa-project.org/wiki/Main_Page) on linux. To use it you will have to install sox. This can be done with the command `sudo apt-get install sox` from the commandline of the machine that node-red is running on.
Once you have sox installed you can install the node by running the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install johanneskropf/node-red-contrib-sox-utils
```
Now restart nodered and it should appear as its own category called Sox Utils in your palette on the left.

##### *mp3*

If you want to play or convert to/from mp3 files you need to install a mp3 handler as sox cant install this by default due to copyright issues with the mp3 codec. If your systems package manager is [apt](https://wiki.debian.org/Apt) you can try `sudo apt-get install libsox-fmt-mp3`.


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

In both single buffer modes the record node will also attach a `msg.format` to the msg object that states the buffers audio format. This way the record node can be directly connected to either the convert node or the play node. You can save those buffers directly to files with the extension from `msg.format` using the file node.

## Play Node

The play node will play an audio file which was send to the node as either a string containing a path to an audio file in the `msg.payload` or as a single buffer containing the audio data in the `msg.payload`. If you want to play audio directly from a buffer you have include a `msg.format` property in the msg object that has the buffer in the `msg.payload`. This `format` property has to state the audio format of the buffer in form of a legal audio file extension readable by sox (eg. wav, mp3, ogg, flac...) as sox otherwise cant know which format the audio input was in. It will try to play the audio on the selected output from the nodes menu. If you select the detailed info option it will send detailed playback progress and information to the output. When finished it will always send a `msg.payload` of `complete`.
You can stop playback at anytime with a `msg.payload` of `stop`.

The node can behave in different ways when a new input arrives while a playback is in progress. The behavior can be set in the nodes options. You can choose if it should either ignore the new input, stop the current playback and replace it with the new input or add new input to a queue.
If the queue mode is selected the node will also accept a `msg.payload` of `clear` to clear the queue and stop the playback after the current item and a `msg.payload` of `next` to skip to the next item in the queue. A `msg.payload` of `stop` in queue mode will also clear the queue in addition to stopping the playback.

## Convert Node

The convert node will convert an audio file which was send to the node as either a string containing a path to an audio file in the `msg.payload` or as a single buffer containing the audio data in the `msg.payload`. If you want to convert audio directly from a buffer you have include a `msg.format` property in the msg object that has the buffer in the `msg.payload`. This `format` property has to state the audio format of the buffer in form of a legal audio file extension readable by sox (eg. wav, mp3, ogg, flac...) as sox otherwise cant know which format the audio input was in.

You can choose to which audio format the input should be converted from the nodes config. By default the converted audio will inherit the applicable parameters from the input. You can change this behaviour by checking the advanced settings check box which will give you more options how the audio should be converted.

The node will output the converted audio as a single binary buffer in the `msg.payload`. The format the audio was converted to will be passed in `msg.format` of the same msg object. You can save those buffers directly to files with the extension from `msg.format` using the file node. You can also connect it directly to the play node.

If you check the box for detailed debug and conversion info you will receive detailed output from sox about the conversion and input/output formats on the second output of the node. You will always receive a `msg.payload` of `complete` when the conversion was finished. 
