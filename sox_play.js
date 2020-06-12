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
    
    function SoxPlayNode(config) {
        RED.nodes.createNode(this,config);
        this.statusTimer = false;
        this.statusTimer2 = false;
        this.outputDeviceRaw = config.outputDevice;
        this.outputDevice = "hw:";
        this.gain = config.gain;
        this.debugOutput = config.debugOutput;
        this.argArr = [];
        this.startNew = config.startNew;
        this.killNew = false;
        this.newPayload = "";
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
        
        function spawnPlay(){
            
            try{
                node.soxPlay = spawn("sox",node.argArr);
            } 
            catch (error) {
                node_status(["error starting play command","red","ring"],1500);
                node.error(error);
                return;
            }
            
            node_status(["playing","blue","dot"]);
            
            node.soxPlay.stderr.on('data', (data)=>{
            
                node.send({payload:data.toString()});
                
            });
            
            node.soxPlay.on('close', function (code,signal) {
                
                node.send({payload:"complete"});
                node_status(["finished","green","dot"],1500);
                delete node.soxPlay;
                if (!node.killNew) {
                    node.argArr = [];
                    if (!node.debugOutput) { node.argArr.push('-q'); }
                } else {
                    node.killNew = false;
                    spawnPlay();
                    if (Buffer.isBuffer(node.newPayload)) {
                        try {
                            node.soxPlay.stdin.write(node.newPayload);
                        } catch (error) {
                            node.error('failed to write buffer to stdin: ' + error)
                        }
                    }
                }
                return;
                
            });
            
            node.soxPlay.stdout.on('data', (data)=>{
                
            });
            return;
        
        }
        
        node_status();
        
        if (node.outputDeviceRaw === 'default') {
            node.outputDevice = node.outputDeviceRaw;
        } else {
            node.outputDevice += node.outputDeviceRaw.toString();
        }
        
        if (!node.debugOutput) { node.argArr.push('-q'); }
        
        node.on('input', function(msg) {
            if (msg.payload === 'stop' && node.soxPlay) {
                node.soxPlay.kill();
            } else if (msg.payload === 'stop' && !node.soxPlay) {
                node.warn('not playing');
            } else if (!node.soxPlay && typeof msg.payload === 'string') {
                node.argArr.push(msg.payload.trim(),'-t','alsa',node.outputDevice,'gain',node.gain);
                spawnPlay();
            } else if (!node.soxPlay && Buffer.isBuffer(msg.payload)) {
                node.argArr.push('-','-t','alsa',node.outputDevice,'gain',node.gain);
                spawnPlay();
                try {
                    node.soxPlay.stdin.write(msg.payload);
                } catch (error) {
                    node.error('failed to write buffer to stdin: ' + error)
                }
            } else if (node.soxPlay && node.startNew === 'start') {
                node.argArr = [];
                if (!node.debugOutput) { node.argArr.push('-q'); }
                if (typeof msg.payload === 'string') {
                    node.argArr.push(msg.payload.trim(),'-t','alsa',node.outputDevice,'gain',node.gain);
                } else if (Buffer.isBuffer(msg.payload)) {
                    node.argArr.push('-','-t','alsa',node.outputDevice,'gain',node.gain);
                }
                node.newPayload = msg.payload;
                node.killNew = true;
                node.soxPlay.kill();
                
            } else {
                node.warn('ignoring input as there is already a playback in progress');
            }
            
        });
        
        node.on("close",function() {
        
            node_status();
            
            if(node.soxPlay) {
                node.soxPlay.kill();
                
            }
            
        });
        
    }
    RED.nodes.registerType("sox-play",SoxPlayNode);

    RED.httpAdmin.get("/soxPlay/devices", RED.auth.needsPermission('sox-play.read'), function(req,res) {
        exec('aplay -l', (error, stdout, stderr) => {
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
}