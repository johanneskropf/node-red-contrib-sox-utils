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
    
    function SoxRecordNode(config) {
        RED.nodes.createNode(this,config);
        this.statusTimer = false;
        this.statusTimer2 = false;
        this.outputBufferArr = [];
        this.outputBuffer = false;
        this.argArr = [];
        this.inputSource = config.inputSource;
        this.inputSourceArr = [];
        this.byteOrder = config.byteOrder;
        this.encoding = config.encoding;
        this.channels = config.channels;
        this.rate = config.rate;
        this.bits = config.bits;
		this.gain = config.gain;
		this.highLowPass = config.highLowPass;
		this.highpass = config.highpass;
		this.lowpass = config.lowpass;
        this.durationType = config.durationType;
        this.durationLength = config.durationLength;
        this.silenceDetection = config.silenceDetection;
        this.silenceThreshold = config.silenceThreshold;
        this.silenceDuration = config.silenceDuration;
        this.outputFormat = config.outputFormat;
        this.debugOutput = config.debugOutput;
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
        
        function spawnRecord(){
        
            let msg1 = {};
            let msg2 = {};
			
            try{
                node.soxRecord = spawn("sox",node.argArr);
            } 
            catch (error) {
                node_status(["error starting record command","red","ring"],1500);
                node.error(error);
                return;
            }
            
            node_status(["recording","blue","dot"]);
            
            node.soxRecord.stderr.on('data', (data)=>{
            
                msg2.payload = data.toString();
                node.send([null,msg2]);
                
            });
            
            node.soxRecord.on('close', function (code,signal) {
                
                if (node.outputFormat == "once") {
                    node.outputBuffer = Buffer.concat(node.outputBufferArr);
                    node.outputBufferArr = [];
                    msg1.payload = node.outputBuffer;
                    node.send([msg1,null]);
                }
                node.send([null,{payload:"complete"}]);
                node_status(["finished","green","dot"],1500);
                delete node.soxRecord;
                return;
                
            });
            
            node.soxRecord.stdout.on('data', (data)=>{
                
                if (node.outputFormat == "once") {
                    node.outputBufferArr.push(data);
                } else if (node.outputFormat == "stream") {
                    msg1.payload = data;
                    node.send([msg1,null]);    
                }
                
            });
            return;
        
        }
        
        if (node.debugOutput) {
            node.argArr.push("-t");
        } else {
            node.argArr.push("-q","-t");
        }    
        node.inputSourceArr = node.inputSource.split(" ");
        node.argArr = node.argArr.concat(node.inputSourceArr);
        node.argArr.push(node.byteOrder,"-e",node.encoding,"-c",node.channels,"-r",node.rate,"-b",node.bits,"-t","raw","-");
        if (node.silenceDetection == "something") {
            node.argArr.push("silence","-l","0","1",node.silenceDuration,node.silenceThreshold + "%");
        }
        if (node.durationType == "limited") {
            node.argArr.push("trim","0",node.durationLength);
        }
		node.argArr.push("gain",node.gain);
		switch(node.highLowPass){
			case "n":
			    break;
		    case "h":
			    node.argArr.push("highpass",node.highpass);
				break;
		    case "l":
			    node.argArr.push("lowpass",node.lowpass);
				break;
			case "b":
			    node.argArr.push("highpass",node.highpass,"lowpass",node.lowpass);
			    break;
		}
        
        node.on('input', function(msg) {
            
            switch(msg.payload){
            
                case "start":
                    
                    if(!node.soxRecord){
                        spawnRecord();
                        node.send([null,{payload:"starting"}]);
                    } else {
                        node.warn("already recording");
                    }
                    return;
                    
                case "stop":
                    
                    if(node.soxRecord){
                        node.soxRecord.kill("SIGINT");
                    } else {
                        node.warn("not recording right now");
                    }
                    return;
                    
            }
            
        });
        
        node.on("close",function() {
        
            node_status();
            
            if(node.soxRecord) {
                node.soxRecord.kill();
            }
            
        });
        
    }
    RED.nodes.registerType("sox-record",SoxRecordNode);
}