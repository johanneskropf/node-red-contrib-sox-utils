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
        this.shm = true;
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
        
        function spawnConvert(){
        
            let msg1 = {};
            let msg2 = {};
            
            try{
                node.soxConvert = spawn("sox",node.argArr);
            } 
            catch (error) {
                node_status(["error starting conversion command","red","ring"],1500);
                node.error(error);
                return;
            }
            
            node_status(["converting","blue","dot"]);
            
            node.soxConvert.stderr.on('data', (data)=>{
            
                msg2.payload = data.toString();
                node.send([null,msg2]);
                
            });
            
            node.soxConvert.on('close', function (code,signal) {
                    
                msg1.format = node.conversionType;
                try {
                    msg1.payload = fs.readFileSync(node.filePath);
                } catch (error) {
                    node.error("couldnt get tmp file after conversion");
                }
                node.send([msg1,null]);
                node.send([null,{payload:"complete"}]);
                node_status(["finished","green","dot"],1500);
                delete node.soxConvert;
                return;
                
            });
            
            node.soxConvert.stdout.on('data', (data)=>{
                
            });
            return;
        
        }
        
        node_status();
        
        node.fileId = node.id.replace(/\./g,"");
        
        if (!fs.existsSync('/dev/shm')) { node.shm = false; }
        
        node.filePath = (node.shm) ? "/dev/shm/" + node.fileId : "/tmp/" + node.fileId;
        
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
        
        node.on('input', function(msg) {
            
            if (node.soxConvert) { node.warn("already converting, ignoring new input"); return; }
            
            node.inputFilePath = "";
            
            if (Buffer.isBuffer(msg.payload)) {
                
                if (msg.payload.length === 0) { node.error("empty buffer"); node_status(["error","red","dot"],1500); return; }
                if (!msg.hasOwnProperty("format")) { node.error("msg with a buffer payload also needs to have a coresponding msg.format property"); node_status(["error","red","dot"],1500); return; }
                node.inputFilePath = (node.shm) ? "/dev/shm/input" + node.fileId + "." + msg.format : "/tmp/input" + node.fileId + "." + msg.format;
                try {
                    fs.writeFileSync(node.inputFilePath, msg.payload);
                } catch (error) {
                    node.error("couldnt write tmp file");
                    node_status(["error","red","dot"],1500)
                }
                
            } else if (typeof msg.payload === "string") {
                if (!fs.existsSync(msg.payload)) { node.error("this file doesnt exist"); node_status(["error","red","dot"],1500); return; }
                node.inputFilePath = msg.payload;
                
            }
            
            if (node.inputFilePath.length === 0) { node.error("not a valid input"); node_status(["error","red","dot"],1500); return; }
            
            node.argArr1 = [];
            if (node.debugOutput) { node.argArr1.push("-V3"); }
            node.argArr1.push(node.inputFilePath);
            node.argArr = node.argArr1.concat(node.argArr2);
                    
            spawnConvert();
            
        });
        
        node.on("close",function() {
        
            node_status();
            
            const checkDir = (node.shm) ? "/dev/shm/" : "/tmp/";
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
            
            if(node.soxConvert) {
                node.soxConvert.kill();
            }
            
        });
        
    }
    RED.nodes.registerType("sox-convert",SoxConvertNode);
}