# node-red-contrib-sox-record

```
!!!this is very much wip, so use with care!!!
```

a simple node-red wrapper around the record functionality of the sox commandline utility

# Basic usage

The node starts recording with the specified settings when it receives a `msg.payload` with the content of `start`.
To stop recording at any time send a `msg.payload` of `stop`.

The node has two outputs.
All audio data will be send to the first output in form of raw audio buffers. You can specify in the node settings if the node should send a stream of buffers while recording or a single buffer when the recording finished or was stopped.
On the second output you will receive a `msg.payload` of `starting` when the recording starts and `complete` when finished. You will also receive any errors or warnings of the sox process that may occur.
If you select the option for detailed debug output you will also receive detailed recording progress info from the sox process while recording.

You can either set the node to record until you stop it or set a specified duration to record and than stop automatically. The duration needs to be put in as seconds. Even when set to record for a specified duration you can still stop the recording at any time with a `msg.payload` of stop.

If you want to save the recorded audio as a wav file you will need to add wav headers to the audio buffer. You can use [node-red-contrib-wav](https://github.com/bartbutenaers/node-red-contrib-wav) for this. Just set the sox-record node to output a single buffer when finished and connect the first output to the wav node. Set the wav node to add headers with the same settings you set the record node to. If you want to save the wav to the file system you can easily use the file node to write the resulting data buffer straight to a wav file.
