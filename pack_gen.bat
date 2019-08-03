set param=[^
	{ ""name"": ""hall"", 	""version"": ""1.0.0"",	 ""include"": true },^
	{ ""name"": ""mj"", 	""version"": ""1.0.1"",	 ""include"": false },^
	{ ""name"": ""pdk"", 	""version"": ""1.0.1"",  ""include"": false}^
]


set DestPath=remote-assets-sub
rd /s /q  "%DestPath%"

::http://10.0.0.249:8091/test/

node pack_generator.js -v 1.0.10 -u http://192.168.2.16:8000/update/remote-assets/ -s build/jsb-link/ -d assets/ -p "%param%"
 


set ObjPath=build\jsb-link
set DestPath=remote-assets
rd /s /q  "%DestPath%"

del remote-assets.zip
md "%DestPath%\res"
md "%DestPath%\src"
xcopy /e /c /y "%ObjPath%\res" "%DestPath%\res"
xcopy /e /c /y "%ObjPath%\src" "%DestPath%\src"
::copy /y "assets\version.manifest" "%DestPath%"
::copy /y "assets\project.manifest" "%DestPath%"

for %%i in ("%ObjPath%"\*.manifest) do (
	copy "%%i" "%DestPath%"
)

::7z a -tzip remote-assets.zip "%DestPath%\*"
::makecab remote-assets remote-assets.zip  只能压缩文件

pause