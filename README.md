# node-red-contrib-sox-record

```
!!!this is very much wip, so use with care!!!
```

a simple node-red wrapper around the record functionality of the [sox commandline utility](http://sox.sourceforge.net/)

# Prerequisites

This node is made to work with the [sox commandline utility](http://sox.sourceforge.net/) on linux. To use it you will have to install sox. This can be done with the command `sudo apt-get install sox` from the commandline of the machine that node-red is running on.
Once you have sox installed you can install the node by running the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install bartbutenaers/node-red-contrib-voice2json
```
Now restart nodered and it should appear in the input category of your palette.

# Basic usage

The node starts recording with the specified settings when it receives a `msg.payload` with the content of `start`.
To stop recording at any time send a `msg.payload` of `stop`.

The node has two outputs.
All audio data will be send to the first output in form of raw audio buffers. You can specify in the node settings if the node should send a stream of buffers while recording or a single buffer when the recording finished or was stopped.
On the second output you will receive a `msg.payload` of `starting` when the recording starts and `complete` when finished. You will also receive any errors or warnings of the sox process that may occur.
If you select the option for detailed debug output you will also receive detailed recording progress info from the sox process while recording.

You can either set the node to record until you stop it or set a specified duration to record and than stop automatically. The duration needs to be put in as seconds. Even when set to record for a specified duration you can still stop the recording at any time with a `msg.payload` of stop.

The node also supports the sox silence detection functionality. You can set the node to stop recording on silence. If you select this option you will have to enter a threshold value and a silence duration. The threshold value determines below which volume threshold in percent the samples should be counted as silence. The duration value determins how long the audio has to be below the silence threshold to stop recording.

You can combine both silence detection and max record duration or use either independent of each other.

If you want to save the recorded audio as a wav file you will need to add wav headers to the audio buffer. You can use [node-red-contrib-wav](https://github.com/bartbutenaers/node-red-contrib-wav) for this. Just set the sox-record node to output a single buffer when finished and connect the first output to the wav node. Set the wav node to add headers with the same settings you set the record node to. If you want to save the wav to the file system you can easily use the file node to write the resulting data buffer straight to a wav file.
