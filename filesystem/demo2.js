self.requestFileSystemSync = self.webkitRequestFileSystemSync ||
                             self.requestFileSystemSync;
//监听主线程
onmessage = function(e) {
	try{
		var fs = requestFileSystemSync(TEMPORARY, 1024*1024);
	    var fileEntry = fs.root.getFile('log.txt', {create: true});
	    var blob = new Blob(['hello file system xxxx']);
	    fileEntry.createWriter().write(blob);
      	postMessage(fileEntry.toURL());
	}catch(e){
		console.log(e);
	}
};