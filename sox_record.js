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
    
    function SoxRecordNode(config) {
        RED.nodes.createNode(this,config);
        this.statusTimer = false;
        this.statusTimer2 = false;
        this.outputBufferArr = [];
        this.outputBuffer = false;
        this.argArr = [];
        this.inputSourceRaw = config.inputSource;
        this.inputSource = "hw:";
        this.inputSourceArr = [];
        this.byteOrder = config.byteOrder;
        this.encoding = config.encoding;
        this.channels = config.channels;
        this.rate = config.rate;
        this.bits = config.bits;
        this.gain = config.gain;
        this.durationType = config.durationType;
        this.durationLength = config.durationLength;
        this.silenceDetection = config.silenceDetection;
        this.silenceThreshold = config.silenceThreshold;
        this.silenceDuration = config.silenceDuration;
        this.outputFormat = config.outputFormat;
        this.manualPath = config.manualPath;
        this.debugOutput = config.debugOutput;
        this.fileId = "";
        this.filePath = "";
        this.shm = true;
        this.checkPath = true;
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
        
        function makeWav(msg, send, done){
            
            let msg2 = {};
            let wavOutputBufferArr = [];
            let wavOutputBuffer = [];
            
            try{
                node.soxWav = spawn("sox",[node.byteOrder,"-e",node.encoding,"-c",node.channels,"-r",node.rate,"-b",node.bits,"-t","raw",node.filePath,"-t","wav","-"]);
            } 
            catch (error) {
                (done) ? done(error) : node.error(error);
                return;
            }
            
            node.soxWav.stderr.on('data', (data)=>{
            
                msg2.payload = data.toString();
                (send) ? send([null,msg2]) : node.send([null,msg2]);
                
            });
            
            node.soxWav.on('close', function (code,signal) {
                
                wavOutputBuffer = Buffer.concat(wavOutputBufferArr);
                msg.payload = wavOutputBuffer;
                msg.format = "wav";
                (send) ? send([msg,null]) : node.send([msg,null]);
                if (done) { done(); }
                delete node.soxWav;
                return;
                
            });
            
            node.soxWav.stdout.on('data', (data)=>{
                
                wavOutputBufferArr.push(data);
                
            });
            return;
            
        }
        
        node.spawnRecord = function(msg, send, done) {
        
            let msg2 = {};
            
            try{
                node.soxRecord = spawn("sox",node.argArr);
            } 
            catch (error) {
                node_status(["error starting record command","red","ring"],1500);
                (done) ? done(error) : node.error(error);
                return;
            }
            
            if (node.outputFormat === 'stream') {
                node_status(["streaming","blue","dot"]);
            } else {
                node_status(["recording","blue","dot"]);
            }
            
            node.soxRecord.stderr.on('data', (data)=>{
            
                msg2.payload = data.toString();
                (send) ? send([null,msg2]) : node.send([null,msg2]);
                
            });
            
            node.soxRecord.on('close', function (code,signal) {
                
                if (node.outputFormat == "once" || node.outputFormat == "wav") {
                    node.outputBuffer = Buffer.concat(node.outputBufferArr);
                    node.outputBufferArr = [];    
                }
                
                switch (node.outputFormat) {
                    case "wav":
                        if (node.shm) {
                            node.filePath = "/dev/shm/tmp" + node.fileId + ".raw";
                        } else {
                            node.filePath = "/tmp/tmp" + node.fileId + ".raw";
                        }
                        try {
                            fs.writeFileSync(node.filePath,node.outputBuffer);
                        }
                        catch (error){
                            (done) ? done("error saving tmp file" + err.message) : node.error("error saving tmp file" + err.message)
                            return;
                        }
                        (node.silenceDetection === "nothing" && node.durationType === "forever") ? makeWav(msg) : makeWav(msg, send, done);
                        break;
                        
                    case "once":
                        msg.payload = node.outputBuffer;
                        msg.format = "raw";
                        (send) ? send([msg,null]) : node.send([msg,null]);
                        break;
                        
                    case "file":
                        msg.payload = node.manualPath;
                        (send) ? send([msg,null]) : node.send([msg,null]);
                        break;
                }
                
                (send) ? send([null,{payload:"complete"}]) : node.send([null,{payload:"complete"}]);
                node_status(["finished","green","dot"],1500);
                delete node.soxRecord;
                if (done && node.outputFormat !== "wav") { done(); }
                return;
                
            });
            
            node.soxRecord.stdout.on('data', (data)=>{
                
                if (node.outputFormat === "file") { return; } 
                if (node.outputFormat !== "stream") {
                    node.outputBufferArr.push(data);
                } else {
                    (send) ? send([{payload:data},null]) : node.send([{payload:data},null]);  
                }
                
            });
            return;
        
        }
        
        node_status();
        
        node.fileId = node.id.replace(/\./g,"");
        
        if(node.outputFormat === "file" && node.manualPath.length === 0) {
            node.error("did you forget to enter a file path?");
            node_status(["file path error","red","dot"]);
            node.checkPath = false;
        } else if (node.outputFormat === "file") {
            node.manualPath.trim();
            node.manualPath += ".wav";
        }
        
        if (!fs.existsSync('/dev/shm')) { node.shm = false; }
        
        (node.debugOutput) ? node.argArr.push("-t") : node.argArr.push("-q","-t");
        
        node.inputSource = (node.inputSourceRaw === 'default') ? node.inputSourceRaw : node.inputSource += node.inputSourceRaw.toString();
           
        node.argArr.push("alsa",node.inputSource);
        
        (node.outputFormat === "file") ?
        node.argArr.push(node.byteOrder,"-e",node.encoding,"-c",node.channels,"-r",node.rate,"-b",node.bits,node.manualPath) :
        node.argArr.push(node.byteOrder,"-e",node.encoding,"-c",node.channels,"-r",node.rate,"-b",node.bits,"-t","raw","-");
        
        if (node.silenceDetection == "something") { node.argArr.push("silence","-l","0","1",node.silenceDuration,node.silenceThreshold + "%"); }
        
        if (node.durationType == "limited") { node.argArr.push("trim","0",node.durationLength); }
        node.argArr.push("gain",node.gain);
        
        node.on('input', function(msg, send, done) {
            
            if (!node.checkPath) {
                (done) ? done("no file path") : node.error("no file path");
                return;
            }
            
            switch(msg.payload){
            
                case "start":
                    
                    if(!node.soxRecord){
                        (node.silenceDetection === "nothing" && node.durationType === "forever") ? node.spawnRecord(msg) : node.spawnRecord(msg, send, done);
                        (send) ? send([null,{payload:"starting"}]) : node.send([null,{payload:"starting"}]);
                    } else {
                        node.warn("already recording");
                    }
                    break;
                    
                case "stop":
                    
                    if(node.soxRecord){
                        node.soxRecord.kill("SIGINT");
                    } else {
                        node.warn("not recording right now");
                    }
                    break;
                    
            }
            if (done && node.silenceDetection === "nothing" && node.durationType === "forever") { done(); }
            return;
            
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
            
            if(node.soxRecord) {
                node.soxRecord.kill();
            }
            
        });
        
    }
    RED.nodes.registerType("sox-record",SoxRecordNode);
    
    RED.httpAdmin.get("/soxRecord/devices", RED.auth.needsPermission('sox-record.read'), function(req,res) {
        exec('arecord -l', (error, stdout, stderr) => {
            if (error) {
                node.error(`exec error: ${error}`);
                return;
            }
            if (stderr) { node.error(`stderr: ${stderr}`); }
            if (stdout) {
                let deviceArr = stdout.split("\n");
                deviceArr = deviceArr.filter(line => line.match(/card/g));
                deviceArr = deviceArr.map(device => {
                    let deviceObj = {};
                    deviceObj.name = device.replace(/\s\[[^\[\]]*\]/g, "");
                    deviceObj.number = device.match(/[0-9](?=\:)/g);
                    return deviceObj;
                });
                res.json(deviceArr);
            }
        });
    });
    
    RED.httpAdmin.post("/soxRecord/:id/record", RED.auth.needsPermission('sox-record.write'), function(req,res) {
        
        var node = RED.nodes.getNode(req.params.id)
        
        if (node != null) {
            try {
                if(!node.soxRecord){
                    msg = {};
                    node.spawnRecord(msg);
                    node.send([null,{payload:"starting"}]);
                    //node.receive({payload:"start"});
                    res.sendStatus(202);
                } else {
                    node.soxRecord.kill("SIGINT");
                    //node.receive({payload:"stop"});
                    res.sendStatus(200);
                }
            } catch(err) {
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(404);
        }
        
    });
}