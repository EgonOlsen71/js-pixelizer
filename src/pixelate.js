Array.prototype.insert = function(index, item) {
	this.splice(index, 0, item);
};

var timer = function() {
    var start = new Date();
    return {
        stop: function() {
            var end  = new Date();
            var time = end.getTime() - start.getTime();
            console.log(time+'ms');
        }
    }
};

function createImage(imgData) {
	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext('2d');
	canvas.width = imgData.width;
	canvas.height = imgData.height;
	ctx.putImageData(imgData, 0, 0);

	var image = new Image();
	image.src = canvas.toDataURL();
	return image;
}

function grabPixels(image) {
	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext('2d');
	canvas.width = image.width;
	canvas.height = image.height;
	ctx.drawImage(image, 0, 0, image.width, image.height);
	return ctx.getImageData(0, 0, image.width, image.height);
}


function calculate(imgData, size, colors, boost) {
	var colorClamp=224;
	if (colors>=128) {
		colorClamp=240;
	}
	if (colors>=256) {
		colorClamp=248;
	}
	
	var canvas = document.createElement('canvas');
	canvas.width = imgData.width;
	canvas.height = imgData.height;
	var ctx = canvas.getContext('2d');
	var cols=new Map();
	var pix=new Array(Math.round((imgData.width*imgData.height*6)/size));
	var pos=0;
	var d=size*size;
	for (var x = 0; x < imgData.width; x=x+size) {
		for (var y = 0; y < imgData.height; y=y+size) {
			var avgr=0;
			var avgg=0;
			var avgb=0;
			var avga=0;
			for (var x1=x; x1<x+size; x1++) {
				var xd=Math.min(x1,imgData.width-1);
				for (var y1=y; y1<y+size; y1++) {
					var yd=Math.min(y1,imgData.height-1);
					var offset = (imgData.width * yd + xd) << 2;
					avgr+= imgData.data[offset];
					avgg+= imgData.data[offset + 1];
					avgb+= imgData.data[offset + 2];
					avga+= imgData.data[offset + 3];
				}
			}
			avga=(Math.round(avga/d) & 255);
			avgt=255/avga;
			avgr=Math.round(avgr*avgt/d) & 255;
			avgg=Math.round(avgg*avgt/d) & 255;
			avgb=Math.round(avgb*avgt/d) & 255;
			
			var key=(avgr & colorClamp)|((avgg & colorClamp)<<8)|((avgb & colorClamp)<<16)|((avga & colorClamp)<<24);
			var cnt=cols.get(key);
			if (!cnt) {
				cnt=1;
			} else {
				cnt+=1;
				if (boost==1) {
					cnt+=Math.sqrt((avgr>>5)+(avgg>>5)+(avgb>>5));
				} else if (boost==2) {
					cnt+=Math.log((avgr>>4)+(avgg>>4)+(avgb>>4));
				}
			}
			cols.set(key, cnt);
			pix[pos++]=x;
			pix[pos++]=y;
			pix[pos++]=avgr;
			pix[pos++]=avgg;
			pix[pos++]=avgb;
			pix[pos++]=avga;
		}
	}
	
	var occs=new Array();
	for (var [key, value] of cols) {
		var sr=key&255;
		var sg=(key>>8)&255;
		var sb=(key>>16)&255;
		var sa=(key>>24)&255;
		occs.push({
			color:key,
			count:value,
			r:sr,
			g:sg,
			b:sb,
			a:sa
		});
	}
	
	occs.sort((a, b) => {
		return b.count-a.count;
	});
	
	occs=occs.slice(0, colors);
	
	for (var c of occs) {
		c.style="rgba("+c.r+", "+c.g+", "+c.b+", "+c.a+")";
	}
	
	for (var i=0; i<pix.length; i+=6) {
		
		var dist=0xFFFFFFFF;
		var ind=0;
		var style=null;
		var cnt=0;
		for (var c of occs) {
			var dr=c.r-pix[i+2];
			var dg=c.g-pix[i+3];
			var db=c.b-pix[i+4];
			var da=c.a-pix[i+5];
			dr*=dr;
			dg*=dg;
			db*=db;
			da*=da;
			var di=dr+dg+db+da;
			if (di<dist) {
				dist=di;
				ind=cnt;
				style=c.style;
			}
			cnt++;
		}
		ctx.fillStyle=style;
		ctx.fillRect(pix[i],pix[i+1],size,size);
	}
	var mod = ctx.getImageData(0,0,imgData.width, imgData.height);
	return mod;
}

function pixelate(source, target, blockSize, colors, boost) {
	var bench=timer();
	var pixels=grabPixels(source);
	var newPixels=calculate(pixels, blockSize, colors, boost);
	var nimg=createImage(newPixels);
	target.src=nimg.src;
	bench.stop();
	
}
