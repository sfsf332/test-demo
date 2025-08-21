import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import CryptoJS from "crypto-js";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [formData, setFormData] = useState({
    did: "",
    asign_key: ""
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [encryptedString, setEncryptedString] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string>("");
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [currentCamera, setCurrentCamera] = useState<string>("environment"); // "environment" 为后置，"user" 为前置
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [actualCameraType, setActualCameraType] = useState<string>("未知");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // 页面加载时从localStorage读取数据和检测设备类型
  useEffect(() => {
    const savedData = localStorage.getItem('formData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
      } catch (error) {
        console.error('解析localStorage数据失败:', error);
      }
    }

    // 检测是否为手机环境
    const detectMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      const mobile = isMobileDevice || isTouchDevice || isSmallScreen;
      setIsMobile(mobile);
      
      // 如果是手机环境，强制使用后置摄像头
      if (mobile) {
        setCurrentCamera("environment");
      }
    };

    detectMobile();
  }, []);

  // 组件卸载时清理扫描器
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (error) {
          console.error('清理扫描器失败:', error);
        }
      }
    };
  }, []);

  // 当扫描状态改变时清理扫描器
  useEffect(() => {
    if (!isScanning && scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.error('清理扫描器失败:', error);
      }
    }
  }, [isScanning]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("表单数据:", formData);
    
    // 将数据存储到localStorage
    localStorage.setItem('formData', JSON.stringify(formData));
    
    // 显示成功提示
    alert('数据已成功保存到localStorage！');
    
    // 清空表单
    setFormData({
      did: "",
      asign_key: ""
    });
  };

  const generateEncryptedQRCode = async () => {
    if (!formData.did || !formData.asign_key) {
      alert('请先填写完整的表单数据！');
      return;
    }

    setIsGenerating(true);
    try {
      // 加密数据
      const dataToEncrypt = JSON.stringify(formData);
      const encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, 'your-secret-key').toString();
      
      // 保存加密后的字符串
      setEncryptedString(encryptedData);
      
      // 生成二维码
      const qrCodeDataUrl = await QRCode.toDataURL(encryptedData);
      setQrCodeUrl(qrCodeDataUrl);
      
      alert('加密二维码生成成功！');
    } catch (error) {
      console.error('生成二维码失败:', error);
      alert('生成二维码失败，请重试！');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadEncryptedString = () => {
    if (!formData.did || !formData.asign_key) {
      alert('请先填写完整的表单数据！');
      return;
    }

    try {
      // 实时加密数据
      const dataToEncrypt = JSON.stringify(formData);
      const encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, 'your-secret-key').toString();
      
      // 创建并下载文本文件
      const blob = new Blob([encryptedData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'encrypted-data.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('加密字符串下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试！');
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    setScannedData("");
    setDecryptedData(null);
    
    try {
      // 如果是手机环境，强制使用后置摄像头
      let stream;
      if (isMobile) {
        try {
          // 首先尝试强制使用后置摄像头
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              facingMode: { exact: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          console.log('成功获取后置摄像头权限');
        } catch (backCameraError) {
          console.log('强制后置摄像头失败，尝试普通后置摄像头:', backCameraError);
          try {
            // 如果强制失败，尝试普通后置摄像头
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
            console.log('成功获取普通后置摄像头权限');
          } catch (fallbackError) {
            console.log('后置摄像头失败，尝试任意可用摄像头:', fallbackError);
            // 最后尝试任意可用的摄像头
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
            console.log('成功获取任意摄像头权限');
          }
        }
      } else {
        // 桌面环境：使用选择的摄像头
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            facingMode: currentCamera === "environment" ? "environment" : "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      }
      
      // 权限获取成功，检测实际使用的摄像头类型
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        if (capabilities.facingMode) {
          const facingMode = capabilities.facingMode;
          if (facingMode.includes('environment')) {
            setActualCameraType('后置摄像头');
          } else if (facingMode.includes('user')) {
            setActualCameraType('前置摄像头');
          } else {
            setActualCameraType('未知类型摄像头');
          }
        } else {
          setActualCameraType('未知类型摄像头');
        }
      }
      
      // 停止预览流
      stream.getTracks().forEach(track => track.stop());
      
      // 使用setTimeout确保DOM元素已经渲染
      setTimeout(() => {
        try {
          // 创建扫描器，配置为优先使用后置摄像头
          scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 }
            },
            false
          );
          
          // 在扫描器渲染完成后，尝试选择后置摄像头
                  scannerRef.current.render((decodedText) => {
          // 扫描成功
          setScannedData(decodedText);
          setIsScanning(false);
          
          // 尝试解密数据
          try {
            const decrypted = CryptoJS.AES.decrypt(decodedText, 'your-secret-key');
            const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
            if (decryptedString) {
              const parsedData = JSON.parse(decryptedString);
              setDecryptedData(parsedData);
              
              // 将解密数据写入localStorage
              localStorage.setItem('formData', JSON.stringify(parsedData));
              
              // 更新表单状态
              setFormData(parsedData);
              
              // 重新生成加密字符串和二维码
              setEncryptedString(decryptedString);
              QRCode.toDataURL(decryptedString).then(qrCodeDataUrl => {
                setQrCodeUrl(qrCodeDataUrl);
              });
              
              alert('二维码扫描成功，数据已解密并保存到localStorage！');
            } else {
              alert('扫描成功，但数据解密失败！');
            }
          } catch (error) {
            console.error('解密失败:', error);
            alert('扫描成功，但数据解密失败！');
          }
          
          // 停止扫描器
          if (scannerRef.current) {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        }, (error) => {
          console.error('扫描错误:', error);
        });

          // 尝试自动选择后置摄像头（如果可用）
          if (currentCamera === "environment") {
            // 延迟一下，等待扫描器完全初始化
            setTimeout(() => {
              try {
                // 这里可以尝试通过DOM操作来切换摄像头
                // 由于html5-qrcode的限制，我们主要通过用户手动切换来实现
              } catch (error) {
                console.log('自动选择后置摄像头失败，用户可手动切换');
              }
            }, 1000);
          }
        } catch (error) {
          console.error('创建扫描器失败:', error);
          alert('创建扫描器失败，请重试！');
          setIsScanning(false);
        }
      }, 100);
      
    } catch (error: any) {
      console.error('摄像头权限申请失败:', error);
      if (error.name === 'NotAllowedError') {
        alert('摄像头权限被拒绝，请在浏览器设置中允许摄像头访问！');
      } else if (error.name === 'NotFoundError') {
        alert('未找到摄像头设备，请检查设备是否连接摄像头！');
      } else {
        alert('摄像头启动失败：' + (error.message || '未知错误'));
      }
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
    // 如果是手机环境，不允许切换摄像头
    if (isMobile) {
      alert('手机环境强制使用后置摄像头，无法切换！');
      return;
    }
    
    if (scannerRef.current) {
      // 停止当前扫描器
      scannerRef.current.clear();
      scannerRef.current = null;
      
      // 切换摄像头
      setCurrentCamera(prev => prev === "environment" ? "user" : "environment");
      
      // 重新启动扫描器
      setTimeout(() => {
        startScanning();
      }, 200);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const clearLocalStorage = () => {
    if (confirm('确定要清空所有保存的数据吗？此操作不可恢复！')) {
      // 清空localStorage
      localStorage.removeItem('formData');
      
      // 重置表单状态
      setFormData({
        did: "",
        asign_key: ""
      });
      setQrCodeUrl("");
      setEncryptedString("");
      setScannedData("");
      setDecryptedData(null);
      
      alert('localStorage已清空，所有数据已重置！');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // 尝试解密数据
        const decrypted = CryptoJS.AES.decrypt(content.trim(), 'your-secret-key');
        const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (decryptedString) {
          const parsedData = JSON.parse(decryptedString);
          
          // 验证数据结构
          if (parsedData.did && parsedData.asign_key) {
            // 填充到localStorage和表单
            localStorage.setItem('formData', JSON.stringify(parsedData));
            setFormData(parsedData);
            
            // 重新生成加密字符串和二维码
            setEncryptedString(content.trim());
            QRCode.toDataURL(content.trim()).then(qrCodeDataUrl => {
              setQrCodeUrl(qrCodeDataUrl);
            });
            
            alert('文件解析成功，数据已填充到表单！');
          } else {
            alert('文件格式错误：缺少必要的字段！');
          }
        } else {
          alert('解密失败：请确保文件包含正确的加密数据！');
        }
      } catch (error) {
        console.error('文件解析失败:', error);
        alert('文件解析失败：请确保文件格式正确！');
      }
    };
    
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        processFile(file);
      } else {
        alert('请上传.txt格式的文件！');
      }
    }
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} font-sans min-h-screen p-8 bg-gray-50`}
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          数据加密管理系统
        </h1>
        {isMobile && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 002 2z" />
              </svg>
              手机环境 - 强制使用后置摄像头
            </div>
            <div className="mt-2 text-xs text-gray-600">
              检测到移动设备，将优先使用后置摄像头进行扫描
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：二维码相关功能 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">二维码功能</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="did" className="block text-sm font-medium text-gray-700 mb-2">
                    DID
                  </label>
                  <input
                    type="text"
                    id="did"
                    name="did"
                    value={formData.did}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#333333]"
                    placeholder="请输入DID"
                  />
                </div>
                
                <div>
                  <label htmlFor="asign_key" className="block text-sm font-medium text-gray-700 mb-2">
                    Asign Key
                  </label>
                  <input
                    type="text"
                    id="asign_key"
                    name="asign_key"
                    value={formData.asign_key}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-[#333333]"
                    placeholder="请输入Asign Key"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  写入localStorage
                </button>
                
                <button
                  type="button"
                  onClick={generateEncryptedQRCode}
                  disabled={isGenerating || !formData.did || !formData.asign_key}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isGenerating ? '生成中...' : '生成加密二维码'}
                </button>
                
                <button
                  type="button"
                  onClick={isScanning ? stopScanning : startScanning}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                >
                  {isScanning ? '停止扫描' : '扫描二维码'}
                </button>
              </form>
            </div>
            
            {/* 二维码显示区域 */}
            {qrCodeUrl && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">生成的二维码</h3>
                <div className="flex justify-center">
                  <img 
                    src={qrCodeUrl} 
                    alt="加密二维码" 
                    className="max-w-full h-auto border border-gray-300 rounded-md"
                  />
                </div>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrCodeUrl;
                      link.download = 'encrypted-qrcode.png';
                      link.click();
                    }}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    下载二维码
                  </button>
                </div>
              </div>
            )}
            
            {/* 扫描结果显示 */}
            {isScanning && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">扫描二维码</h3>
                <div className="text-center mb-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-600">正在申请摄像头权限...</p>
                </div>
                <div id="qr-reader" className="w-full"></div>
                <div className="mt-4 text-center space-x-4">
                  {!isMobile && (
                    <button
                      onClick={switchCamera}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      切换摄像头 ({currentCamera === "environment" ? "后置" : "前置"})
                    </button>
                  )}
                  <button
                    onClick={stopScanning}
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    停止扫描
                  </button>
                </div>
                <div className="mt-2 text-center text-sm text-gray-600">
                  当前使用: {isMobile ? "后置摄像头（手机环境强制）" : (currentCamera === "environment" ? "后置摄像头" : "前置摄像头")}
                  {actualCameraType !== "未知" && (
                    <div className="mt-1 text-xs text-blue-600">
                      实际检测: {actualCameraType}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {scannedData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">扫描结果</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-300">
                  <p className="text-sm text-gray-600 break-all font-mono">
                    {scannedData}
                  </p>
                </div>
                {decryptedData && (
                  <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-center">
                    <span className="text-green-800 text-sm font-medium">
                      ✅ 数据已成功保存到localStorage
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {decryptedData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">解密后的数据</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-300">
                  <pre className="text-sm text-gray-600 overflow-auto">
                    {JSON.stringify(decryptedData, null, 2)}
                  </pre>
                </div>
                <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-center">
                  <span className="text-green-800 text-sm font-medium">
                    ✅ 数据已成功保存到localStorage
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* 右侧：字符串下载上传功能 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">字符串管理</h2>
              
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={downloadEncryptedString}
                  disabled={!formData.did || !formData.asign_key}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  下载加密字符串
                </button>
                
                <button
                  type="button"
                  onClick={clearLocalStorage}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  清空localStorage
                </button>
                
                <div 
                  className="relative border-2 border-dashed border-gray-300 rounded-md p-4 transition-colors"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="file-upload"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    点击上传加密文件
                  </label>
                  <div className="mt-2 text-center text-sm text-gray-500">
                    或拖拽.txt文件到此处
                  </div>
                </div>
              </div>
            </div>
            
            {/* 当前表单数据 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">当前表单数据</h3>
              <div className="bg-gray-50 p-3 rounded border border-gray-300">
                <pre className="text-sm text-gray-600 overflow-auto">
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>
            </div>
            
            {/* 加密字符串显示 */}
            {encryptedString && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">加密后的字符串</h3>
                <div className="bg-gray-50 p-3 rounded border border-gray-300">
                  <p className="text-sm text-gray-600 break-all font-mono">
                    {encryptedString}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
