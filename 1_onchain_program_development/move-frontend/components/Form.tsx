import { FC } from "react"
import { Movie } from "../models/Movie"
import { useState } from "react"
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    Textarea,
    Switch,
} from "@chakra-ui/react"
import * as web3 from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { MOVIE_REVIEW_PROGRAM_ID } from "../utils/constants"

export const Form: FC = () => {
    const [title, setTitle] = useState("")
    const [rating, setRating] = useState(0)
    const [description, setDescription] = useState("")
    const [toggle, setToggle] = useState(true)

    const { connection } = useConnection()
    const { publicKey, sendTransaction } = useWallet()

    const handleSubmit = (event: any) => {
        event.preventDefault()
        if (!publicKey) {
            alert("Please connect your wallet!")
            return
        }

        const movie = new Movie(title, rating, description, publicKey)
        handleTransactionSubmit(movie)
    }

    const handleTransactionSubmit = async (movie: Movie) => {
        if (!publicKey) {
            alert("Please connect your wallet!")
            return
        }

        const buffer = movie.serialize(toggle ? 0 : 1)
        const transaction = new web3.Transaction()

        const [pda, ] = await web3.PublicKey.findProgramAddressSync(
            [publicKey.toBuffer(), Buffer.from(movie.title)], // new TextEncoder().encode(movie.title)],
            new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID)
        )

        const [pdaCounter, ] = await web3.PublicKey.findProgramAddressSync(
            [pda.toBuffer(), Buffer.from("comment")], // new TextEncoder().encode(movie.title)],
            new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID)
        )

        const instruction = new web3.TransactionInstruction({
            keys: [
                {
                    pubkey: publicKey,
                    isSigner: true,
                    isWritable: false,
                },
                {
                    pubkey: pda,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: pdaCounter,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: web3.SystemProgram.programId,
                    isSigner: false,
                    isWritable: false,
                },
            ],
            data: buffer,
            programId: new web3.PublicKey(MOVIE_REVIEW_PROGRAM_ID),
        })

        transaction.add(instruction)

        try {
            let txid = await sendTransaction(transaction, connection)
            alert(
                `Transaction submitted: https://explorer.solana.com/tx/${txid}?cluster=devnet`
            )
            console.log(
                `Transaction submitted: https://explorer.solana.com/tx/${txid}?cluster=devnet`
            )
        } catch (e) {
            console.log(JSON.stringify(e))
            alert(JSON.stringify(e))
        }
    }

    return (
        <Box
            p={4}
            display={{ md: "flex" }}
            maxWidth="32rem"
            borderWidth={1}
            margin={2}
            justifyContent="center"
        >
            <form onSubmit={handleSubmit}>
                <FormControl isRequired>
                    <FormLabel color="gray.200">Movie Title</FormLabel>
                    <Input
                        id="title"
                        color="gray.400"
                        onChange={(event) =>
                            setTitle(event.currentTarget.value)
                        }
                    />
                </FormControl>
                <FormControl isRequired>
                    <FormLabel color="gray.200">Add your review</FormLabel>
                    <Textarea
                        id="review"
                        color="gray.400"
                        onChange={(event) =>
                            setDescription(event.currentTarget.value)
                        }
                    />
                </FormControl>
                <FormControl isRequired>
                    <FormLabel color="gray.200">Rating</FormLabel>
                    <NumberInput
                        max={5}
                        min={1}
                        onChange={(valueString) =>
                            setRating(parseInt(valueString))
                        }
                    >
                        <NumberInputField id="amount" color="gray.400" />
                        <NumberInputStepper color="gray.400">
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </FormControl>
                <FormControl display="center" alignItems="center">
                    <FormLabel color="gray.100" mt={2}>
                        Update
                    </FormLabel>
                    <Switch
                        id="update"
                        onChange={(event) =>
                            setToggle((prevCheck) => !prevCheck)
                        }
                    />
                </FormControl>
                <Button width="full" mt={4} type="submit">
                    Submit Review
                </Button>
            </form>
        </Box>
    )
}