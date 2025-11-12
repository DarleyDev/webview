import WebViewer from '@pdftron/webviewer'
import { useEffect, useRef, useState } from 'react'
import './App.css'

const App = () => {
	const viewer = useRef<HTMLDivElement>(null)
	const [fullLink, setFullLink] = useState<string | null>(null)

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
			const finalLink = generatedLink ? modifyUrl(generatedLink) : updatedUrl
			console.log('final', finalLink, updatedUrl)
			// Инициализируем WebViewer только после загрузки fullLink
			WebViewer.WebComponent(
  {
    path: '/webviewer/lib',
    initialDoc: finalLink,
    licenseKey: 'demo:1736328772922:7eb21df90300000000aae0f4a438996d64f0dd5754eea3e629cf0dd833',
  },
  viewer.current
).then(instance => {
  // ВАЖНО: Устанавливаем локальные шрифты СРАЗУ после создания instance
  instance.Core.setCustomFontURL('/webfonts/v2/');

  instance.UI.setLanguage('ru');
  const { documentViewer, annotationManager, Annotations } = instance.Core;
});		
	}

		fetchData()
	}, [globalLink]) // fullLink убран из зависимостей, так как его загружаем внутри `fetchData`

	return (
		<div className='App'>
			<div className='webviewer' ref={viewer}></div>
		</div>
	)
}

export default App
