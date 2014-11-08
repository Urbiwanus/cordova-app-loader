var CordovaPromiseFS =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Static Private functions
	 */

	/* createDir, recursively */
	function __createDir(rootDirEntry, folders, success,error) {
	  rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
	    // Recursively add the new subfolder (if we still have another to create).
	    if (folders.length > 1) {
	      __createDir(dirEntry, folders.slice(1),success,error);
	    } else {
	      success(dirEntry);
	    }
	  }, error);
	}

	function dirname(str) {
	  var parts = str.split('/');
	  if(parts.length > 1) {
	    parts.splice(parts.length-1,1);
	    return parts.join('/');
	  } else {
	    return '';
	  }
	}

	function filename(str) {
	  var parts = str.split('/');
	  return parts[parts.length-1];
	}

	var transferQueue = [], // queued fileTransfers
	    inprogress = 0;     // currently active filetransfers

	/**
	 * Factory function: Create a single instance (based on single FileSystem)
	 */
	module.exports = function(options){
	  /* Promise implementation */
	  var Promise = options.Promise || window.Promise;
	  if(!Promise) { throw new Error("No Promise library given in options.Promise"); }
	  
	  /* default options */
	  this.options = options = options || {};
	  options.persistent = options.persistent !== undefined? options.persistent: true;
	  options.storageSize = options.storageSize || 20*1024*1024;
	  options.concurrency = options.concurrency || 3;
	  options.retry = options.retry || [];

	  /* Cordova deviceready promise */
	  var deviceready = new Promise(function(resolve,reject){
	    document.addEventListener("deviceready", resolve, false);
	    setTimeout(function(){ reject(new Error('deviceready has not fired after 5 seconds.')); },5100);
	  });


	  /* the filesystem! */
	  var fs = new Promise(function(resolve,reject){
	    deviceready.then(function(){
	      window.requestFileSystem(options.persistent? 1: 0, options.storageSize, resolve, reject);
	      setTimeout(function(){ reject(new Error('Could not retrieve FileSystem after 5 seconds.')); },5100);
	    },reject);
	  });

	  /* debug */
	  fs.then(function(fs){
	    window.__fs = fs;
	  },function(err){
	    console.error('Could not get Cordova FileSystem:',err);
	  });

	  function create(path){
	    return ensure(dirname(path)).then(function(){
	      return file(path,{create:true});
	    });
	  }

	  /* ensure directory exists */
	  function ensure(folders) {
	    return fs.then(function(fs){
	      return new Promise(function(resolve,reject){
	          if(!folders) {
	            resolve(fs.root);
	          } else {
	            folders = folders.split('/').filter(function(folder) {
	              return folder && folder.length > 0 && folder[0] !== '.';
	            });
	            __createDir(fs.root,folders,resolve,reject);
	          }
	        });
	    });
	  }

	  /* does file exist? If so, resolve with fileEntry, if not, resolve with false. */
	  function exists(path){
	    return new Promise(function(resolve,reject){
	      file(path).then(
	        function(fileEntry){
	          resolve(fileEntry);
	        },
	        function(err){
	          if(err.code === 1) {
	            resolve(false);
	          } else {
	            reject(err);
	          }
	        }
	      );
	    });
	  }

	  /* convert path to URL to be used in JS/CSS/HTML */
	  function toURL(path) {
	    return file(path).then(function(fileEntry) {
	      return fileEntry.toURL();
	    });
	  }

	  /* convert path to URL to be used in JS/CSS/HTML */
	  function toInternalURL(path) {
	    return file(path).then(function(fileEntry) {
	      return fileEntry.toInternalURL();
	    });
	  }

	  /* synchronous helper to get internal URL. */
	  function toInternalURLSync(path){
	    if(path[0] !== '/') path = '/' + path;
	    return 'cdvfile://localhost/'+(options.persistent? 'persistent':'temporary') + path;
	  }

	  /* convert path to base64 date URI */
	  function toDataURL(path) {
	    return read(path,'readAsDataURL');
	  }

	  /* get file file */
	  function file(path,options){
	    options = options || {};
	    return new Promise(function(resolve,reject){
	      return fs.then(function(fs){
	        fs.root.getFile(path,options,resolve,reject);
	      },reject);
	    });
	  }

	  /* get directory entry */
	  function dir(path,options){
	    options = options || {};
	    return new Promise(function(resolve,reject){
	      return fs.then(function(fs){
	        if(!path || path === '/') {
	          resolve(fs.root);
	        } else {
	          fs.root.getDirectory(path,options,resolve,reject);
	        }
	      },reject);
	    });
	  }

	  /* return contents of a file */
	  function read(path,method) {
	    method = method || 'readAsText';
	    return file(path).then(function(fileEntry) {
	      return new Promise(function(resolve,reject){
	        fileEntry.file(function(file){
	          var reader = new FileReader();
	          reader.onloadend = function(){
	            resolve(this.result);
	          };
	          reader[method](file);
	        },reject);
	      });
	    });
	  }

	  function readJSON(path){
	    return read(path).then(JSON.parse);
	  }

	  /* write contents to a file */
	  function write(path,blob,mimeType) {
	    return ensure(dirname(path))
	      .then(function() { return file(path,{create:true}); })
	      .then(function(fileEntry) {
	        return new Promise(function(resolve,reject){
	          fileEntry.createWriter(function(writer){
	            writer.onwriteend = resolve;
	            writer.onerror = reject;
	            if(typeof blob === 'string') {
	              blob = new Blob([blob],{type: mimeType || 'text/plain'});
	            } else if(blob instanceof Blob !== true){
	              blob = new Blob([JSON.stringify(blob,null,4)],{type: mimeType || 'application/json'});
	            }
	            writer.write(blob);
	          },reject);
	        });
	      });
	    }

	  /* move a file */
	  function move(src,dest) {
	    return ensure(dirname(dest))
	      .then(function(dir) {
	        return file(src).then(function(fileEntry){
	          return new Promise(function(resolve,reject){
	            fileEntry.moveTo(dir,filename(dest),resolve,reject);
	          });
	        });
	      });
	  }

	  /* copy a file */
	  function copy(src,dest) {
	    return ensure(dirname(dest))
	      .then(function(dir) {
	        return file(src).then(function(fileEntry){
	          return new Promise(function(resolve,reject){
	            fileEntry.copyTo(dir,filename(dest),resolve,reject);
	          });
	        });
	      });
	  }

	  /* delete a file */
	  function remove(path,mustExist) {
	    var method = mustExist? file:exists;
	    return new Promise(function(resolve,reject){
	        method(path).then(function(fileEntry){
	        if(fileEntry !== false) {
	          fileEntry.remove(resolve,reject);
	        } else {
	          resolve();
	        }
	      },reject);
	    });
	  }

	  /* delete a directory */
	  function removeDir(path) {
	    return dir(path).then(function(dirEntry){
	      return new Promise(function(resolve,reject) {
	        dirEntry.removeRecursively(resolve,reject);
	      });
	    });
	  }

	  /* list contents of a directory */
	  function list(path,mode) {
	    mode = mode || '';
	    var recursive = mode.indexOf('r') > -1;
	    var getAsEntries = mode.indexOf('e') > -1;
	    var onlyFiles = mode.indexOf('f') > -1;
	    var onlyDirs = mode.indexOf('d') > -1;
	    if(onlyFiles && onlyDirs) {
	      onlyFiles = false;
	      onlyDirs = false;
	    }

	    return new Promise(function(resolve,reject){
	      return dir(path).then(function(dirEntry){
	        var dirReader = dirEntry.createReader();
	        dirReader.readEntries(function(entries) {
	          var promises = [Promise.resolve(entries)];
	          if(recursive) {
	            entries
	              .filter(function(entry){return entry.isDirectory; })
	              .forEach(function(entry){
	                promises.push(list(entry.fullPath,'re'));
	              });
	          }
	          Promise.all(promises).then(function(values){
	              var entries = [];
	              entries = entries.concat.apply(entries,values);
	              if(onlyFiles) entries = entries.filter(function(entry) { return entry.isFile; });
	              if(onlyDirs) entries = entries.filter(function(entry) { return entry.isDirectory; });
	              if(!getAsEntries) entries = entries.map(function(entry) { return entry.fullPath; });
	              resolve(entries);
	            },reject);
	        }, reject);
	      },reject);
	    });
	  }

	  // Whenever we want to start a transfer, we call popTransferQueue
	  function popTransferQueue(){
	    // while we are not at max concurrency
	    while(transferQueue.length > 0 && inprogress < options.concurrency){
	      // increment activity counter
	      inprogress++;
	      
	      // fetch filetranfer, method-type (isDownload) and arguments
	      var args = transferQueue.pop();
	      var ft = args.shift();
	      var isDownload = args.shift();
	      
	      if(ft._aborted) {
	        inprogress--;
	      } else if(isDownload){
	        ft.download.apply(ft,args);
	      } else {
	        // Stupid API. 'upload' switched around the 'trustAllHosts' and 'options' arguments.
	        var opts = args[4]; args[4] = args[5]; args[5] = opts;
	        // Switch around serverUrl/localPath because we transfer in reverse direction
	        var localPath = args[1]; args[1] = args[0]; args[0] = localPath;
	        ft.upload.apply(ft,args);
	      }
	    }
	    // if we are at max concurrency, popTransferQueue() will be called whenever
	    // the transfer is ready and there is space avaialable.
	  }

	  // Promise callback to check if there are any more queued transfers 
	  function nextTransfer(result){
	    inprogress--; // decrement counter to free up one space to start transfers again!
	    popTransferQueue(); // check if there are any queued transfers
	    return result;
	  }

	  function filetransfer(isDownload,serverUrl,localPath,transferOptions,onprogress){
	    if(typeof transferOptions === 'function') {
	      onprogress = transferOptions;
	      transferOptions = {};
	    }
	    serverUrl = encodeURI(serverUrl);
	    localPath = toInternalURLSync(localPath);

	    transferOptions = transferOptions || {};
	    if(!transferOptions.retry || !transferOptions.retry.length) {
	      transferOptions.retry = options.retry.concat();
	    }
	    
	    var ft = new FileTransfer();
	    var promise = new Promise(function(resolve,reject){
	      var attempt = function(err){
	        if(transferOptions.retry.length === 0) {
	          reject(err);
	        } else {
	          transferQueue.unshift([ft,isDownload,serverUrl,localPath,resolve,attempt,transferOptions.trustAllHosts || false,transferOptions]);
	          var timeout = transferOptions.retry.shift();
	          if(timeout > 0) {
	            setTimeout(nextTransfer,timeout);
	          } else {
	            nextTransfer();
	          }
	        }
	      };
	      transferOptions.retry.unshift(0);
	      inprogress++;
	      attempt();
	    });
	    promise.then(nextTransfer,nextTransfer);
	    if(typeof onprogress === 'function') ft.onprogress = onprogress;
	    promise.progress = function(onprogress){
	      ft.onprogress = onprogress;
	      return promise;
	    };
	    promise.abort = function(){
	      ft._aborted = true;
	      ft.abort();
	      return promise;
	    };
	    return promise;
	  }

	  function download(url,dest,options,onprogress){
	    return filetransfer(true,url,dest,options,onprogress);
	  }

	  function upload(source,dest,options,onprogress){
	    return filetransfer(false,dest,source,options,onprogress);
	  }

	  return {
	    fs: fs,
	    file: file,
	    filename: filename,
	    dir: dir,
	    dirname: dirname,
	    create:create,
	    read: read,
	    readJSON: readJSON,
	    write: write,
	    move: move,
	    copy: copy,
	    remove: remove,
	    removeDir: removeDir,
	    list: list,
	    ensure: ensure,
	    exists: exists,
	    download: download,
	    upload: upload,
	    toURL:toURL,
	    toInternalURL:toInternalURL,
	    toDataURL:toDataURL,
	    deviceready: deviceready,
	    options: options,
	    Promise: Promise
	  };
	};

/***/ }
/******/ ])