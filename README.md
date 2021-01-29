# node-red-contrib-sox-utils

```
!!!this is very much wip, so use with care!!!
```

a simple node-red wrapper around some of the record, play and convert functionality of the [sox commandline utility](http://sox.sourceforge.net/) on **linux**.

# Prerequisites

This node is made to work with the [sox commandline utility](http://sox.sourceforge.net/) and [the Advanced Linux Sound Architecture (ALSA)](https://alsa-project.org/wiki/Main_Page) on linux. To use it you will have to install sox. This can be done with the command `sudo apt-get install sox` from the commandline of the machine that node-red is running on.
Once you have sox installed you can install the node by running the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install johanneskropf/node-red-contrib-sox-utils
```
*git needs to be installed for installs from a repository.*
Now restart nodered and it should appear as its own category called Sox Utils in your palette on the left.

##### *mp3*

If you want to play or convert to/from mp3 files you need to install a mp3 handler as sox cant install this by default due to copyright issues with the mp3 codec. If your systems package manager is [apt](https://wiki.debian.org/Apt) you can try `sudo apt-get install libsox-fmt-mp3`.


# Basic usage

## Record Node

The node starts recording with the specified settings from the choosen source when the button on the left side of the node is pressed. Press again to stop. Altenatively it can receive a `msg.payload` with the content of `start` or `stop` to start or stop recording at any time.

The node has two outputs.
All audio data will be send to the first output in form of audio buffers (or the file name of the recorded audio when in file mode). You can specify in the node settings if the node should send a stream of raw buffers while recording or either a single raw buffer or a single wav buffer when the recording finished or was stopped.
It can also write the recording to a specified file path as a wav file. Please enter the path and name of your file but **not the extension** as this gets auto added!
On the second output you will receive a `msg.payload` of `starting` when the recording starts and `complete` when finished. You will also receive any errors or warnings of the sox process that may occur.
If you select the option for detailed debug output you will also receive detailed recording progress info from the sox process while recording.

You can either set the node to record until you stop it or set a specified duration to record and than stop automatically. The duration needs to be put in as seconds. Even when set to record for a specified duration you can still stop the recording at any time with a `msg.payload` of `stop`.

The node also supports the sox silence detection functionality. You can set the node to stop recording on silence. If you select this option you will have to enter a threshold value and a silence duration (those have to be point numbers, eg 1.0 or 2.3). The threshold value determines below which volume threshold in percent the samples should be counted as silence. The duration value determins how long the audio has to be below the silence threshold to stop recording.

You can combine both silence detection and max record duration or use either independent of each other.

In both single buffer modes the record node will also attach a `msg.format` to the msg object that states the buffers audio format. This way the record node can be directly connected to either the convert node or the play node. You can save those buffers directly to files with the extension from `msg.format` using the file node.

## Play Node

The play node will play an audio file which was send to the node as either a string containing a path to an audio file in the `msg.payload` or as a single buffer containing the audio data in the `msg.payload`. If you want to play audio directly from a buffer the node will try to "guess" the file format (it can do this for aiff, wav, flac, mp3 and ogg currently). Should this not work include a `msg.format` property in the msg object that has the buffer in the `msg.payload`. This `format` property has to than state the audio format of the buffer in form of a legal audio file extension readable by sox (eg. dat, aiff, vorbis...) as sox otherwise cant know which format the audio input was in. It will try to play the audio on the selected output from the nodes menu. If you select the detailed info option it will send detailed playback progress and information to the output. When finished it will always send a `msg.payload` of `complete`.
You can stop playback at anytime with a `msg.payload` of `stop`.

The node can behave in different ways when a new input arrives while a playback is in progress. The behavior can be set in the nodes options. You can choose if it should either ignore the new input, stop the current playback and replace it with the new input or add new input to a queue.
If the queue mode is selected the node will also accept a `msg.payload` of `clear` to clear the queue and stop the playback after the current item and a `msg.payload` of `next` to skip to the next item in the queue. A `msg.payload` of `stop` in queue mode will also clear the queue in addition to stopping the playback.

## Convert Node

The convert node will convert an audio file which was send to the node as either a string containing a path to an audio file in the `msg.payload` or as a single buffer containing the audio data in the `msg.payload`. If you want to convert audio directly from a buffer it will try to "guess" the input format similar to the play node. Otherwise you also have to include a `msg.format` property in the msg object that has the buffer in the `msg.payload` that states the buffers audio format as explained in the play node section.

You can choose to which audio format the input should be converted to from the nodes config. By default the converted audio will inherit the applicable parameters from the input. You can change this behaviour by checking the advanced settings check box which will give you more options how the audio should be converted.

The node will output the converted audio as a single binary buffer in the `msg.payload` or directly to a file in which case it will send the file name and path as a `msg.payload` to the first output.  The format the audio was converted to will be passed in `msg.format` if in buffer mode. You can save those buffers directly to files with the extension from `msg.format` using the file node. You can also connect it directly to the play node in either mode. If in file mode please enter the path and name of your file but **not the extension** as this gets auto added!

If the type of input audio is **raw** you need to add additional information to the input `msg` for the conversion to work. Those are:
  * the bits per sample as `msg.bits`
  * the encoding as `msg.encoding`
  * the sample rate as `msg.rate`
  * the channels as `msg.channels`
If the audio is raw output from the sox record node those `msg` properties are already included.

If you check the box for detailed debug and conversion info you will receive detailed output from sox about the conversion and input/output formats on the second output of the node. You will always receive a `msg.payload` of `complete` when the conversion was finished on this second output.

# Additional Information and Features

## Handling large files

As the nodes try to do as much as possible in memory by using buffers or writing tmp files to /dev/shm you would need a lot of ram or change the size of /dev/shm to deal with very large or very many files. If you plan to record long pieces of high quality audio or play very large audio files please use the file based input/output that all nodes in this suite include as an option. This way sox will read and write the data directly from and to your filesystem which in that occasion is preferable. 

## Passing additonal effects to the record and convert nodes

Both the record and convert node support adding additional effects that will be tagged on the sox command to execute. You can pass those additional arguments as a string in `msg.options` which contains the effects in the same format as they would be used in the sox command line utility. For example you could use `highpass 200 lowpass 8000` in `msg.options` to add a high and lowpass filter. The record node needs to be in the *control with `msg.payload`* mode to be able to pass in the additional arguments with the start msg. Keep in mind that not all effects might work. To debug use the detailed debug output to the second output option.

## Setting the output file with `msg.filename`

You can use `msg.filename` in the input `msg` for both the record and convert node to dynamically set the name of the file to be written. This will overwrite the path set in the nodes config for this input msg. It will only work if the node is in output to file beforehand. The string in `msg.filename` has to be a full path to a writable location.

## Beta recording from a stream of raw audio audio chunks and listening to it

### Recording from a stream of raw audio chunks

When you receive a stream of raw audio chunks from some other location than a microphone or an audio interface attached to the machine this node is running on you can now record this stream with all functionality of the sox record node. You can choose the record from node input option in the source dropdown. If the record node was in button mode it will automatically switch to input mode. An additional menu section will become available where you will have to enter header information about the input chunks manually for this to work. If the input messages have audio header information as `msg` properties as its is the case with messages coming from another sox record node this header information will overwrite the one entered in the node.

### Listening to a stream of raw audio chunks

If you select the input is a raw audio stream option in the play node you can feed a stream of raw audio chunks into the node and it will attempt to play it. This option is exclusive to the other playback options. If it is selected the other playback options for files like queue, skip, replace become unavailable. You will have to enter the header information for the expected audio stream in the section of the menu that does become available when the stream option is selected. The timing of the input chunks is crucial for a smooth playback so you will propably experience choppiness if the chunks traveled through other nodes or over a network as they are fed to sox as is. If the input `msg` objects contain audio header information as `msg` properties as its is the case with messages coming from the sox record node this header information will overwrite the one entered in the node.
