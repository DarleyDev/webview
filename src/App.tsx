import WebViewer from '@pdftron/webviewer'
import { useEffect, useRef, useState } from 'react'
import './App.css'

const App = () => {
    const viewer = useRef<HTMLDivElement>(null)
    const [fullLink, setFullLink] = useState<string | null>(null)
    const [isPdf, setIsPdf] = useState<boolean>(false)
    const [originalUrl, setOriginalUrl] = useState<string>('')

    // Получаем базовый URL из переменной окружения
    const globalLink = import.meta.env.VITE_API_URL

    // Функция для получения полной ссылки
    const getFullLink = async (arg: string) => {
        try {
            const response = await fetch(
                `https://simfpolyteh.ru/backend_files/media/generateLink?webPath=${arg}`
            )
            const data = await response.json()

            if (response.ok) {
                setFullLink(data.link) // Устанавливаем `fullLink` в стейт
                return data.link
            } else {
                throw new Error('Ошибка в получении данных')
            }
        } catch (error) {
            setFullLink(null)
            console.error(error)
            return null
        }
    }

    // Функция для проверки типа файла по URL
    const checkFileType = async (url: string): Promise<string | null> => {
        try {
            // Делаем HEAD запрос для получения заголовков
            const response = await fetch(url, { method: 'HEAD' })

            if (response.ok) {
                const contentType = response.headers.get('content-type')
                const contentDisposition = response.headers.get('content-disposition')

                // Проверяем по Content-Type
                if (contentType) {
                    if (contentType.includes('application/pdf')) {
                        return 'pdf'
                    } else if (contentType.includes('image/')) {
                        return 'image'
                    } else if (contentType.includes('text/')) {
                        return 'text'
                    }
                }

                // Проверяем по расширению файла в URL
                const urlLower = url.toLowerCase()
                if (urlLower.endsWith('.pdf')) {
                    return 'pdf'
                } else if (urlLower.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
                    return 'image'
                }

                // Проверяем по content-disposition
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i)
                    if (filenameMatch) {
                        const filename = filenameMatch[1].toLowerCase()
                        if (filename.endsWith('.pdf')) {
                            return 'pdf'
                        }
                    }
                }
            }

            return null
        } catch (error) {
            console.error('Error checking file type:', error)

            // Если HEAD запрос не работает, проверяем по расширению
            const urlLower = url.toLowerCase()
            if (urlLower.endsWith('.pdf')) {
                return 'pdf'
            }

            return null
        }
    }

    function modifyUrl(url: string): string {
        const mediaIndex = url.indexOf('media/files/')
        if (mediaIndex !== -1) {
            return (
                url.slice(0, mediaIndex + 'media/files/'.length) +
                'files-manager/' +
                url.slice(mediaIndex + 'media/files/'.length)
            )
        }
        return url
    }

    useEffect(() => {
        const fetchData = async () => {
            if (!viewer.current) return

            const currentUrl = window.location.href
            const baseUrl = `${import.meta.env.VITE_API_URL_2}` // Значение из переменной
            const newBaseUrl = 'https://simfpolyteh.ru/api' // Новое значение

            const updatedUrl = currentUrl.includes('webview/inner')
                ? 'https://simfpolyteh.ru/backend_files/'
                : currentUrl.replace(`${baseUrl}/webview`, newBaseUrl)

            // Извлекаем слово после 'inner' и декодируем его
            const match = currentUrl.match(/inner\/(.+)/)
            let globalInnerWorld = ''
            if (match) {
                globalInnerWorld = decodeURIComponent(match[1])
            }

            // Получаем fullLink асинхронно
            const generatedLink = globalInnerWorld
                ? await getFullLink(globalInnerWorld)
                : updatedUrl

            // Определяем URL для WebViewer
            let finalLink = generatedLink ? modifyUrl(generatedLink) : updatedUrl
            console.log('final', finalLink, updatedUrl)

            // Сохраняем оригинальную ссылку
            setOriginalUrl(finalLink)

            // Проверяем тип файла
            const fileType = await checkFileType(finalLink)
            console.log('File type detected:', fileType)

            if (fileType === 'pdf') {
                // Если PDF - делаем редирект на оригинальную ссылку
                setIsPdf(true)
                console.log('PDF detected, redirecting to original URL')

                // Добавляем параметры для нативного просмотра PDF
                const pdfUrlWithParams = `${finalLink}#toolbar=0&navpanes=0`

                // Используем iframe для нативного просмотра PDF
                const iframe = document.createElement('iframe')
                iframe.src = pdfUrlWithParams
                iframe.style.width = '100%'
                iframe.style.height = '100vh'
                iframe.style.border = 'none'
                iframe.title = 'PDF Viewer'

                // Очищаем контейнер и добавляем iframe
                if (viewer.current) {
                    viewer.current.innerHTML = ''
                    viewer.current.appendChild(iframe)
                }

                return // Прерываем выполнение, т.к. используем нативный просмотр
            }

            // Если не PDF, продолжаем с WebViewer
            setIsPdf(false)

            // Инициализируем WebViewer только после загрузки fullLink
            WebViewer.WebComponent(
                {
                    path: '/webviewer/lib',
                    initialDoc: finalLink,
                    licenseKey: 'demo:1736328772922:7eb21df90300000000aae0f4a438996d64f0dd5754eea3e629cf0dd833',
                },
                viewer.current
            ).then(instance => {
                // Устанавливаем локальные шрифты
                instance.Core.setCustomFontURL('/webfonts/v2/');

                // Язык
                instance.UI.setLanguage('ru');

                // ПАНОМИРОВАНИЕ ПО УМОЛЧАНИЮ
                instance.UI.setToolMode('Pan'); // Главное: включаем панорамирование
                instance.UI.disableElements(['textSelectButton']); // Отключаем кнопку выделения
                instance.UI.enableElements(['panToolButton']);     // Включаем кнопку панорамирования

                // Опционально: переключиться на вкладку "View" в тулбаре
                instance.UI.setToolbarGroup('toolbarGroup-View');

                // Доступ к ядру
                const { documentViewer, annotationManager, Annotations } = instance.Core;
            });
        }

        fetchData()
    }, [globalLink])

    return (
        <div className='App'>
            {isPdf && (
                <div style={{
                    padding: '10px',
                    background: '#f0f0f0',
                    textAlign: 'center',
                    fontSize: '14px',
                    borderBottom: '1px solid #ccc'
                }}>
                    PDF документ открыт в нативном просмотрщике.
                    <a
                        href={originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '10px', color: '#0066cc' }}
                    >
                        Открыть в новой вкладке
                    </a>
                </div>
            )}
            <div className='webviewer' ref={viewer}></div>
        </div>
    )
}

export default App
