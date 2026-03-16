SHELL := /bin/bash

.PHONY: test build-image docker-release release clean clean-dist manifest package-release

test:
	$(MAKE) -C packages/ffmpeg-core test

build-image:
	$(MAKE) -C packages/ffmpeg-core build-image

docker-release:
	$(MAKE) -C packages/ffmpeg-core docker-release

release:
	$(MAKE) -C packages/ffmpeg-core release

clean:
	$(MAKE) -C packages/ffmpeg-core clean

clean-dist:
	$(MAKE) -C packages/ffmpeg-core clean-dist

manifest:
	$(MAKE) -C packages/ffmpeg-core manifest

package-release:
	$(MAKE) -C packages/ffmpeg-core package-release
