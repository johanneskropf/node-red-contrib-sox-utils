module.exports = function(RED) {

    const { spawn } = require("child_process");
    
    function SoxRecordNode(config) {
        RED.nodes.createNode(this,config);
        this.statusTimer = false;
        this.statusTimer2 = false;
        this.outputBufferArr = [];
        this.outputBuffer = false;
        this.argArr = [];
        this.argArr0 = [];
        this.argArr1 = [];
        this.argArr2 = [];
        this.inputSource = config.inputSource;
        this.inputSourceArr = [];
        this.byteOrder = config.byteOrder;
        this.encoding = config.encoding;
        this.channels = config.channels;
        this.rate = config.rate;
        this.bits = config.bits;
        this.durationType = config.durationType;
        this.durationLength = config.durationLength;
        this.outputFormat = config.outputFormat;
        this.debugOutput = config.debugOutput;
        var node = this;
        
        function node_status(text,color,shape,time){
            node.status({fill:color,shape:shape,text:text});
            if(node.statusTimer !== false){
                clearTimeout(node.statusTimer);
                node.statusTimer = false;
            }
            node.statusTimer = setTimeout(() => {
                node.status({});
                node.statusTimer = false;
            },time);
        }
        
        function node_status2(text,color,shape,time){
            if(node.statusTimer2 !== false){
                clearTimeout(node.statusTimer2);
                node.statusTimer2 = false;
            }
            node.statusTimer2 = setTimeout(() => {
                node.status({fill:color,shape:shape,text:text});
                node.statusTimer2 = false;
            },time);
        }
        
        function spawnRecord(){
        
            let msg1 = {};
            let msg2 = {};
            try{
                node.soxRecord = spawn("sox",node.argArr);
            } 
            catch (error) {
                node_status2("error starting record command","red","ring",1);
                node.error(error);
                return;
            }
            
            node_status2("recording","blue","dot",1);
            
            node.soxRecord.stderr.on('data', (data)=>{
                //node.error("stderr: " + data.toString());
                //node_status("error","red","dot",1500);
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
                node_status("finished","green","dot",1500);
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
            node.argArr0 = ["-t"];
        } else {
            node.argArr0 = ["-q","-t"];
        }    
        node.inputSourceArr = node.inputSource.split(" ");
        node.argArr1 = node.argArr0.concat(node.inputSourceArr);
        node.argArr2 = [node.byteOrder,"-e",node.encoding,"-c",node.channels,"-r",node.rate,"-b",node.bits,"-t","raw","-"];
        node.argArr = node.argArr1.concat(node.argArr2);
        if (node.durationType == "limited") {
            node.argArr.push("trim","0",node.durationLength);
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
            if(node.statusTimer !== false){
               clearTimeout(node.statusTimer);
               node.statusTimer = false;
               node.status({});
            }
            
            if(node.statusTimer2 !== false){
               clearTimeout(node.statusTimer2);
               node.statusTimer2 = false;
               node.status({});
            }
            
            if(node.soxRecord) {
                node.soxRecord.kill();
            }
        });
        
    }
    RED.nodes.registerType("sox-record",SoxRecordNode);
}