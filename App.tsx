import React, { useState, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { Home } from './components/Home';
import { Restaurants } from './components/Restaurants';
import { RestaurantDetail } from './components/RestaurantDetail';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { Toast } from './components/Toast';
import { confirmarPedido } from './services/api';
import { ComingSoon } from './components/ComingSoon';
import { RequestService } from './components/RequestService';
import { Admin } from './components/Admin';
import { Login } from './components/Login';
import { Page, Restaurant, MenuItem, CartItem, Ingredient, UserRole } from './types';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  console.log('App component is rendering');
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('session', session);
      if (session) {
        // Assuming a simple role logic for now
        // You might want to have a 'roles' table in your DB
        // and check user roles from there.
        setUserRole('user'); 
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('onAuthStateChange', session);
      if (session) {
        setUserRole('user');
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000); // Hide after 3 seconds
  };

  const handleLogin = (role: 'admin' | 'user') => {
    setUserRole(role);
    if (role === 'admin') {
      setCurrentPage('admin');
    } else {
      setCurrentPage('home');
    }
  };

  const handleGuestLogin = () => {
    setUserRole('guest');
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentPage('restaurantDetail');
  };
  
  const handleBackToRestaurants = () => {
    setSelectedRestaurant(null);
    setCurrentPage('restaurants');
  };

  const handleSelectMenuItem = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setCurrentPage('productDetail');
  };

  const handleBackToMenu = () => {
    setSelectedMenuItem(null);
    setCurrentPage('restaurantDetail');
  };

  const handleAddToCart = (item: MenuItem, quantity: number, customizedIngredients: Ingredient[]) => {
    const cartItemId = `${item.id}-${customizedIngredients.map(i => i.name).sort().join('-')}`;
    
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === cartItemId);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === cartItemId
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      return [...prevCart, { id: cartItemId, product: item, quantity, customizedIngredients }];
    });
    showToast("¡Añadido al carrito!");
    setCurrentPage('restaurantDetail'); // Go back to menu after adding
  };

  const handleUpdateCart = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
       handleRemoveFromCart(cartItemId);
    } else {
      setCart(cart => cart.map(item => item.id === cartItemId ? { ...item, quantity: newQuantity } : item));
    }
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(cart => cart.filter(item => item.id !== cartItemId));
  };

  const handleConfirmOrder = async (phoneNumber: string) => {
    try {
      await confirmarPedido(cart, phoneNumber);
      showToast("¡Pedido recibido! Recibirás una confirmación por WhatsApp.");
      setCart([]);
      setCurrentPage('restaurants');
    } catch (error) {
      console.error("Order confirmation failed:", error);
      showToast("Hubo un problema al confirmar el pedido.");
    }
  };


  const renderContent = () => {
    if (!userRole) {
      return <Login onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;
    }

    switch (currentPage) {
      case 'home':
        return <Home onNavigate={() => setCurrentPage('request')} setCurrentPage={setCurrentPage} />;
      case 'request':
        return <RequestService />;
      case 'restaurants':
        return <Restaurants onSelectRestaurant={handleSelectRestaurant} />;
      case 'restaurantDetail':
        if (selectedRestaurant) {
          return <RestaurantDetail restaurant={selectedRestaurant} onSelectItem={handleSelectMenuItem} onBack={handleBackToRestaurants} />;
        }
        return <ComingSoon title="Restaurantes" />;
      case 'productDetail':
        if (selectedMenuItem && selectedRestaurant) {
          return <ProductDetail item={selectedMenuItem} restaurant={selectedRestaurant} onAddToCart={handleAddToCart} onBack={handleBackToMenu} />
        }
        return <ComingSoon title="Restaurantes" />; // Fallback
      case 'cart':
        return <Cart cartItems={cart} onUpdateCart={handleUpdateCart} onNavigate={setCurrentPage} onConfirmOrder={handleConfirmOrder} />;
      case 'admin':
        if (userRole === 'admin') {
          return <Admin />;
        }
        return <ComingSoon title="Restaurantes" />;
      default:
        return <ComingSoon title="Restaurantes" />;
    }
  };
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-gray-200 font-sans h-full">
      <div className="relative w-full md:max-w-sm mx-auto h-full bg-white md:shadow-lg flex flex-col">
        <main className="flex-grow overflow-y-hidden bg-gray-50 no-scrollbar">
           <div key={currentPage} className="animate-fade-in pb-20 h-full">
             {renderContent()}
           </div>
        </main>
        {userRole && userRole !== 'admin' && currentPage !== 'productDetail' && (
          <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} cartItemCount={cartItemCount} userRole={userRole} handleLogout={handleLogout} />
        )}
        <Toast message={toastMessage} />
      </div>
    </div>
  );
};

export default App;