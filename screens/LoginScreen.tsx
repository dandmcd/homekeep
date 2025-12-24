import React, { useState } from "react";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { TextInput } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { Center } from "@/components/ui/center";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "react-native";

export default function LoginScreen() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleEmailSignIn = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password");
            return;
        }
        try {
            setIsSigningIn(true);
            await signInWithEmail(email, password);
        } catch (error) {
            Alert.alert(
                "Sign In Failed",
                error instanceof Error ? error.message : "An error occurred during sign in"
            );
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleEmailSignUp = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password");
            return;
        }
        try {
            setIsSigningIn(true);
            await signUpWithEmail(email, password);
        } catch (error) {
            Alert.alert(
                "Sign Up Failed",
                error instanceof Error ? error.message : "An error occurred during sign up"
            );
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setIsSigningIn(true);
            await signInWithGoogle();
        } catch (error) {
            Alert.alert(
                "Sign In Failed",
                error instanceof Error ? error.message : "An error occurred during sign in"
            );
        } finally {
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return (
            <Center className="flex-1 bg-background-50">
                <Spinner size="lg" />
            </Center>
        );
    }

    return (
        <Center className="flex-1 bg-background-50 p-5">
            <VStack space="lg" className="w-full max-w-[300px] items-center">
                <Heading size="3xl" className="text-typography-900 mb-2">
                    Homekeep
                </Heading>
                <Text size="lg" className="text-typography-500 mb-8 text-center">
                    Sign in to manage your home
                </Text>

                <VStack space="md" className="w-full">
                    <VStack space="xs">
                        <Text className="text-typography-500 font-medium text-sm">Email</Text>
                        <TextInput
                            className="bg-background-0 border border-outline-200 rounded-md p-3 text-typography-900"
                            placeholder="Enter email"
                            placeholderTextColor="#A3A3A3"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                    </VStack>
                    <VStack space="xs">
                        <Text className="text-typography-500 font-medium text-sm">Password</Text>
                        <TextInput
                            className="bg-background-0 border border-outline-200 rounded-md p-3 text-typography-900"
                            placeholder="Enter password"
                            placeholderTextColor="#A3A3A3"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </VStack>

                    <Button
                        variant="solid"
                        action="primary"
                        onPress={handleEmailSignIn}
                        disabled={isSigningIn}
                    >
                        {isSigningIn ? (
                            <Spinner size="sm" color="white" />
                        ) : (
                            <ButtonText>Sign In</ButtonText>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        action="secondary"
                        onPress={handleEmailSignUp}
                        disabled={isSigningIn}
                    >
                        <ButtonText>Sign Up</ButtonText>
                    </Button>
                </VStack>

                <Text size="sm" className="text-typography-400 my-2 text-center">
                    or
                </Text>

                <Button
                    size="xl"
                    variant="outline"
                    action="primary"
                    onPress={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="w-full"
                >
                    {isSigningIn ? (
                        <Spinner size="sm" color="black" />
                    ) : (
                        <ButtonText>Sign into Google</ButtonText>
                    )}
                </Button>

                <Text size="sm" className="text-typography-400 mt-4 text-center">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </Text>
            </VStack>
        </Center>
    );
}
