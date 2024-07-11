import { FC, useState } from 'react'
// import styles from '../styles/PingButton.module.css'

export const PingButton: FC = () => {

    const onClick = () => {
        console.log('Ping!')
    }

	return (
		<div  onClick={onClick}>
			<button >Ping!</button>
		</div>
	)
}