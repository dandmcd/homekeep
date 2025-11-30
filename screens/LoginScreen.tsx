import React, { useState } from "react";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { Center } from "@/components/ui/center";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator, Alert } from "react-native";

export default function LoginScreen() {
    const { signInWithGoogle, loading } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);

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
                <ActivityIndicator size="large" />
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

                <Button
                    size="xl"
                    variant="solid"
                    action="primary"
                    onPress={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="w-full"
                >
                    {isSigningIn ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <ButtonText>Sign in with Google</ButtonText>
                    )}
                </Button>

                <Text size="sm" className="text-typography-400 mt-4 text-center">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </Text>
            </VStack>
        </Center>
    );
}
