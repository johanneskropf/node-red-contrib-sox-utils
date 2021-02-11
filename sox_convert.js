/**
 * Copyright 2020 Johannes Kropf
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {

    const { spawn } = require("child_process");
    const { exec } = require("child_process");
    const { execSync } = require("child_process");
    const fs = require("fs");
    
    function SoxConvertNode(config) {
        RED.nodes.createNode(this,config);
        this.statusTimer = false;
        this.statusTimer2 = false;
        this.argArr = [];
        this.argArr1 = [];
        this.argArr2 = [];
        this.conversionType = config.conversionType;
        this.wavMore = config.wavMore;
        this.wavByteOrder = config.wavByteOrder;
        this.wavEncoding = config.wavEncoding;
        this.wavChannels = config.wavChannels;
        this.wavRate = config.wavRate;
        this.wavBits = config.wavBits;
        this.flacMore = config.flacMore;
        this.flacCompression = config.flacCompression;
        this.flacChannels = config.flacChannels;
        this.flacRate = config.flacRate;
        this.flacBits = config.flacBits;
        this.mp3More = config.mp3More;
        this.mp3Channels = config.mp3Channels;
        this.mp3Rate = config.mp3Rate;
        this.mp3BitRate = config.mp3BitRate;
        this.oggMore = config.oggMore;
        this.oggCompression = config.oggCompression;
        this.oggChannels = config.oggChannels;
        this.oggRate = config.oggRate;
        this.fileId = "";
        this.filePath = "";
        this.inputFilePath = "";
        this.debugOutput = config.debugOutput;
        this.outputToFile = config.outputToFile;
        this.manualPath = config.manualPath;
        this.partialPath = "";
        this.checkPath = true;
        this.system = true;
        this.testFormat;
        this.altPath = false;
        var node = this;
        
        function node_status(state1 = [], timeout = 0, state2 = []){
            
            if (state1.length !== 0) {
                node.status({fill:state1[1],shape:state1[2],text:state1[0]});
            } else {
                node.status({});
            }
            
            if (node.statusTimer !== false) {
                clearTimeout(node.statusTimer);
                node.statusTimer = false;
            }
            
            if (timeout !== 0) {
                node.statusTimer = setTimeout(() => {
                
                    if (state2.length !== 0) {
                        node.status({fill:state2[1],shape:state2[2],text:state2[0]});
                    } else {
                        node.status({});
                    }
                    
                    node.statusTimer = false;
                    
                },timeout);
            }
            
        }
        
        function guessFormat(input){
            
            const formats = [
                [["aiff"],[0x46,0x4F,0x52,0x4D,0x00]],
                [["wav"],[0x52,0x49,0x46,0x46]],
                [["flac"],[0x66,0x4C,0x61,0x43]],
                [["ogg"],[0x4F,0x67,0x67,0x53,0x00,0x02,0x00,0x00]],
                [["mp3"],[0x49,0x44,0x33]],
                [["mp3"],[0xFF,0xFB]]
            ];
            const result = formats.filter(element => input.includes(Buffer.from(element[1])));
            if (result.length === 0) { return false; }
            return result[0][0];
            
        }
        
        function spawnConvert(msg, send, done){
        
            let msg2 = {};
            
            try{
                node.soxConvert = spawn("sox",node.argArr);
            } 
            catch (error) {
                node_status(["error starting conversion command","red","ring"],1500);
                (done) ? done(error) : node.error(error);
                return;
            }
            
            node_status(["converting","blue","dot"]);
            
            node.soxConvert.stderr.on('data', (data)=>{
            
                msg2.payload = data.toString();
                (send) ? send([null,msg2]) : node.send([null,msg2]);
                
            });
            
            node.soxConvert.on('close', function (code,signal) {
                
                if (node.outputToFile === "buffer") {
                    msg.format = node.conversionType;
                    try {
                        msg.payload = fs.readFileSync(node.filePath);
                    } catch (error) {
                        node_status(["error","red","dot"],1500);
                        delete node.soxConvert;
                        (done) ? done("couldnt get tmp file after conversion") : node.error("couldnt get tmp file after conversion");
                        return;
                    }
                } else {
                    msg.format = node.conversionType;
                    msg.payload = (node.altPath) ? node.altPath : node.filePath;
                }
                (send) ? send([msg,null]) : node.send([msg,null]);
                (send) ? send([null,{payload:"complete"}]) : node.send([null,{payload:"complete"}]);
                node_status(["finished","green","dot"],1500);
                node.altPath = false;
                delete node.soxConvert;
                if (done) { done(); }
                return;
            });
            
            node.soxConvert.stdout.on('data', (data)=>{
                
            });
            return;
        
        }
        
        node_status();
        
        if (process.platform === 'linux') {
            node.partialPath = (fs.existsSync('/dev/shm')) ?
            "/dev/shm/" :
            "/tmp/";
        } else if (process.platform === "darwin") {
            node.warn("im a mac")
            node.partialPath = execSync('echo $TMPDIR');
            node.partialPath = String(node.partialPath).trim();
        } else {
            node.system = false;
        }
        
        node.fileId = node.id.replace(/\./g,"");
        
        if (node.outputToFile === "file" && !node.manualPath) {
            node.error("did you forget to enter a file path? bing bing");
            node_status(["file path error","red","dot"]);
            node.checkPath = false;
        } else if (node.outputToFile === "file") {
            node.filePath = node.manualPath;
        } else {
            node.filePath = node.partialPath + node.fileId;
        }
        
        switch (node.conversionType) {
            case "wav":
                node.filePath += ".wav";
                if (node.wavMore) {
                    node.argArr2 = [node.wavByteOrder,"-e",node.wavEncoding,"-c",node.wavChannels,"-r",node.wavRate,"-b",node.wavBits,node.filePath];
                } else {
                    node.argArr2 = [node.filePath];
                }
                break;
                
            case "flac":
                node.filePath += ".flac";
                if (node.flacMore) {
                    node.argArr2 = ["-C",node.flacCompression,"-c",node.flacChannels,"-r",node.flacRate,"-b",node.flacBits,node.filePath];
                } else {
                    node.argArr2 = ["-C",node.flacCompression,node.filePath];
                }
                break;
                
            case "mp3":
                node.filePath += ".mp3";
                if (node.mp3More) {
                    node.argArr2 = ["-c",node.mp3Channels,"-r",node.mp3Rate,"-C",node.mp3BitRate,node.filePath];
                } else {
                    node.argArr2 = ["-C",node.mp3BitRate,node.filePath];
                }
                break;
                
            case "ogg":
                node.filePath += ".ogg";
                if (node.oggMore) {
                    node.argArr2 = ["-c",node.oggChannels,"-r",node.oggRate,"-C",node.oggCompression,node.filePath];
                } else {
                    node.argArr2 = ["-C",node.oggCompression,node.filePath];
                }
                break;
        }
        
        node.on('input', function(msg, send, done) {
            
            if (!node.system) {
                (done) ? done("Error. This node only works on Linux with ALSA and Sox.") : node.error("Error. This node only works on Linux with ALSA and Sox.");
                node_status(["platform error","red","ring"]);
                return;
            }
            
            if (node.soxConvert) {
                node.warn("already converting, ignoring new input");
                if (done) { done(); }
                return;
            }
            
            if (!node.checkPath) {
                (done) ? done("no file path") : node.error("no file path");
                return;
            }
            
            if (typeof msg.payload === "string" && msg.payload.length === 0) {
                (done) ? done("String input was empty") : node.error("String input was empty");
                return;
            }
            
            if (msg.hasOwnProperty("filename")) {
                if (typeof msg.filename !== "string") {
                    node.warn("ignoring msg.filename as it is not a string, msg.filename should be a legal path to a file in string format");
                } else if (node.outputToFile !== "file") {
                    node.warn("ignoring msg.filename as it can only overwrite destination if in file output mode");
                } else if (!msg.filename.match(node.conversionType)) {
                    node.warn("ignoring msg.filename as extension of msg.filepath has to match conversion type");
                } else {
                    let swap = node.argArr2.length - 1;
                    node.argArr2.splice(swap, 1, msg.filename);
                    node.altPath = msg.filename;
                }
            }
            
            node.inputFilePath = "";
            
            if (Buffer.isBuffer(msg.payload)) {
                if (msg.payload.length === 0) {
                    node_status(["error","red","dot"],1500);
                    (done) ? done("empty buffer") : node.error("empty buffer");
                    return;
                }
                const testBuffer = msg.payload.slice(0,8);
                node.testFormat = guessFormat(testBuffer);
                if (!node.testFormat) {
                    if (!msg.hasOwnProperty("format")) {
                        node_status(["error","red","dot"],1500);
                        (done) ? done("msg with a buffer payload also needs to have a coresponding msg.format property") : node.error("msg with a buffer payload also needs to have a coresponding msg.format property");
                        node_status(["error starting conversion command","red","ring"],1500);
                        return;
                    }
                    node.testFormat = msg.format;
                }
                node.inputFilePath = node.partialPath + node.fileId + "input." + node.testFormat;
                try {
                    fs.writeFileSync(node.inputFilePath, msg.payload);
                } catch (error) {
                    (done) ? done("couldnt write tmp file") : node.error("couldnt write tmp file");
                    node_status(["error","red","dot"],1500)
                }
                
            } else if (typeof msg.payload === "string") {
                if (!fs.existsSync(msg.payload)) {
                    (done) ? done("this file doesnt exist") : node.error("this file doesnt exist");
                    node_status(["error","red","dot"],1500);
                    return;
                }
                node.inputFilePath = msg.payload;
                
            }
            
            node.argArr1 = [];
            if (node.debugOutput) { node.argArr1.push("-V3"); }
            if (node.testFormat === "raw") {
                if (!msg.rate || !msg.encoding || !msg.bits || !msg.channels) {
                    (done) ? done("when converting raw audio you need to provide the following as properties of the incoming msg: the sample rate as msg.rate, the encoding as msg.encoding, the bits per sample as msg.bits and the channels of the audio as msg.channels") : node.error("when converting raw audio you need to provide the following as properties of the incoming msg: the sample rate as msg.rate, the encoding as msg.encoding, the bits per sample as msg.bits and the channels of the audio as msg.channels");
                    return;
                }
                let rawArr = ["-r",msg.rate,"-e",msg.encoding,"-b",msg.bits,"-c",msg.channels];
                node.argArr1 = node.argArr1.concat(rawArr);
            }
            node.argArr1.push(node.inputFilePath);
            if (msg.hasOwnProperty("options")) {
                if (typeof msg.options !== "string") {
                    (done) ? done("options should be send as a single string including the additional arguments as per the sox commandline documentation.") : node.error("options should be send as a single string including the additional arguments as per the sox commandline documentation.");
                    return;
                }
                let options = msg.options.trim().split(" ");
                node.argArr = node.argArr1.concat(node.argArr2, options);
                delete msg.options;
            } else {
                node.argArr = node.argArr1.concat(node.argArr2);
            }
              
            spawnConvert(msg, send, done);
            
        });
        
        node.on("close",function() {
        
            node_status();
            
            if (node.system) {
                const checkDir = node.partialPath;
                fs.readdir(checkDir, (err,files) => {
                    if (err) { node.error("couldnt check for leftovers in " + checkDir); return; }
                    files.forEach(file => {
                        if (file.match(node.fileId)) {
                            try {
                                fs.unlinkSync(checkDir + file);
                            } catch (error) {
                                node.error("couldnt delete leftover " + file);
                            }
                        }
                    });
                    return;
                });
            }
                
            if(node.soxConvert) {
                node.soxConvert.kill();
            }
            
        });
        
    }
    RED.nodes.registerType("sox-convert",SoxConvertNode);
}